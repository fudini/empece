use std::path::PathBuf;

use serde_derive::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Sequences {
  pub count: usize,
  #[serde(rename = "Sequence")]
  pub items: Vec<Sequence>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Sequence {
  #[serde(rename = "@number")]
  pub number: usize,
  pub active: bool,
  pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct SeqIndex {
  #[serde(rename = "@repeat")]
  pub repeat: usize,
  #[serde(rename = "$value")]
  pub value: usize,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Song {
  #[serde(rename = "@number")]
  pub number: usize,
  pub name: String,
  pub tempo_ignore: bool,
  #[serde(default)]
  pub seq_index: Vec<SeqIndex>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Songs {
  pub count: usize,
  #[serde(rename = "Song")]
  pub items: Vec<Song>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Locator {
  #[serde(rename = "LocatorBar")]
  pub bar: usize,
  #[serde(rename = "LocatorBeat")]
  pub beat: usize,
  #[serde(rename = "LocatorPulse")]
  pub pulse: usize,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Locators {
  #[serde(rename = "Locator")]
  pub locator: Vec<Locator>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct AllSeqSamps {
  pub sequences: Sequences,
  pub songs: Songs,
  pub locators: Locators,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct MPCVObject {
  pub version: Version,
  pub all_seq_samps: AllSeqSamps,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Version {
  #[serde(rename = "File_Version")]
  pub file_version: String,
  pub application: String,
  #[serde(rename = "Application_Version")]
  pub application_version: String,
  pub platform: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MpcProject {
  /// The root directory that containx .xpj file
  pub root: PathBuf,
  /// The directory that contains [ProjectData]
  pub root_project_data: PathBuf,
  // Project file name
  pub file_path: PathBuf,
  pub sas: MPCVObject,
}
