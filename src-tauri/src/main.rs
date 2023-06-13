// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod constants;
mod errors;
mod pretty;
mod types;
mod utils;

use constants::Paths;
use errors::SaveProjectError;
use midly::{MetaMessage, Smf, TrackEventKind::Meta};
use quick_xml::de;
use std::{collections::HashMap, fs, path::Path, sync::Mutex};
use types::{MPCVObject, MpcProject};

struct State {
  project: Option<MpcProject>,
}

impl State {
  fn new() -> Mutex<Self> {
    Mutex::new(Self { project: None })
  }
}

type MState = Mutex<State>;

#[tauri::command]
fn save_project(
  project: &str,
  number_mapping: &str,
  state: tauri::State<MState>,
) -> Result<String, String> {
  save_project_inner(project, number_mapping, state)
    .map_err(|err| err.to_string())
}

fn save_project_inner(
  project_to_save: &str,
  number_mapping: &str,
  state: tauri::State<MState>,
) -> Result<String, SaveProjectError> {
  let state = (*state).lock().unwrap();
  let Some(ref project) = state.project else {
    return Err(SaveProjectError::NoProject)
  };

  let backup_dir = std::env::temp_dir().join(utils::random_dir_name());

  let mpc_project: MpcProject = serde_json::from_str(project_to_save)?;

  let number_mapping: HashMap<String, String> =
    serde_json::from_str(number_mapping)?;
  let mpc_project_xml = quick_xml::se::to_string(&mpc_project.sas)?;

  let pretty_xml = pretty::pretty(&mpc_project_xml);
  let with_header = format!(
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\n{}",
    pretty_xml
  );
  // well, I gave up trying to make it serialize as uppercase True/False
  let final_xml_sas = with_header
    .replace(">true<", ">True<")
    .replace(">false<", ">False<");

  println!("Backup dir: {}", backup_dir.display());
  // create the temp directory
  fs::create_dir(backup_dir.clone())?;

  println!("Backing up {}", Paths::SAS_FILE_NAME);
  // copy the sequences and songs file
  fs::copy(
    project.root_project_data.join(Paths::SAS_FILE_NAME),
    backup_dir.join(Paths::SAS_FILE_NAME),
  )?;

  // copy the *.sxq files
  for seq in &project.sas.all_seq_samps.sequences.items {
    println!("Backing up {}.sxq", seq.number);
    fs::copy(
      project
        .root_project_data
        .join(format!("{}.sxq", seq.number)),
      backup_dir.join(format!("{}.sxq", seq.number)),
    )?;
    fs::remove_file(
      project
        .root_project_data
        .join(format!("{}.sxq", seq.number)),
    )?;
  }

  println!("Backup complete, saving '{}'", Paths::SAS_FILE_NAME);

  fs::write(
    project.root_project_data.join(Paths::SAS_FILE_NAME),
    final_xml_sas,
  )?;

  // for seq in &project.sas.all_seq_samps.sequences.items {
  for seq in &mpc_project.sas.all_seq_samps.sequences.items {
    let remapped_number = number_mapping.get(&seq.number.to_string()).unwrap();
    println!(
      "Renaming sequence in {}.sxq -> {}.sqx",
      seq.number, remapped_number
    );

    // Parsing sxq file - there are names of sequences embedded in the
    let sxq_bytes =
      fs::read(backup_dir.join(format!("{}.sxq", remapped_number))).unwrap();
    let mut smf = Smf::parse(&sxq_bytes).unwrap();
    let name = format!("{}\0", seq.name);

    let first_track = smf.tracks.first_mut().unwrap();
    let mut sequence_name = first_track
      .iter_mut()
      .find(|track| matches!(track.kind, Meta(MetaMessage::TrackName(_))))
      .unwrap();

    sequence_name.kind = Meta(MetaMessage::TrackName(name.as_bytes()));

    println!(
      "Writing {}.sxq -> {}.sqx, name: {}",
      seq.number, remapped_number, name
    );
    smf
      .save(
        project
          .root_project_data
          .join(format!("{}.sxq", seq.number)),
      )
      .unwrap();
  }

  // If we got here we don't need a backup anymore
  fs::remove_dir_all(backup_dir)?;
  Ok("Ok".into())
}

#[tauri::command]
fn parse_project(file_path: &str, state: tauri::State<MState>) -> String {
  let path = Path::new(file_path).to_path_buf();
  let file_name = path.file_name().expect("No file name");
  let root_project_data_name = format!(
    "{}_[ProjectData]",
    file_name.to_str().expect("Bad path").replace(".xpj", "")
  );

  let root = path.parent().expect("File has no directory").to_path_buf();
  let root_project_data = root.join(root_project_data_name);

  let sas_path = root_project_data.join(Paths::SAS_FILE_NAME);
  let file = fs::read_to_string(sas_path).unwrap();
  let sas: MPCVObject = de::from_str(&file).unwrap();

  let mpc_project = MpcProject {
    root,
    root_project_data,
    file_path: file_path.into(),
    sas,
  };

  let json = serde_json::to_string_pretty(&mpc_project).unwrap();
  (*state).lock().unwrap().project = Some(mpc_project);
  json
}

fn main() {
  tauri::Builder::default()
    .manage(State::new())
    .invoke_handler(tauri::generate_handler![parse_project, save_project])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
