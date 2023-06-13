use std::io;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SaveProjectError {
  #[error("Io error {0}")]
  IoError(#[from] io::Error),

  #[error("Serde json error {0}")]
  JsonParse(#[from] serde_json::Error),

  #[error("Serde XML error {0}")]
  XmlParse(#[from] quick_xml::de::DeError),

  #[error("No project loaded")]
  NoProject,
}
