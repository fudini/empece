use quick_xml::{events::Event, Reader, Writer};

pub fn pretty(xml: &str) -> String {
  let mut reader = Reader::from_str(xml);
  reader.trim_text(true);

  let mut writer = Writer::new_with_indent(Vec::new(), b' ', 2);

  loop {
    let ev = reader.read_event();

    match ev {
      Ok(Event::Eof) => break, // exits the loop when reaching end of file
      Ok(event) => writer.write_event(event),
      Err(e) => {
        panic!("Error at position {}: {:?}", reader.buffer_position(), e)
      }
    }
    .expect("Failed to parse XML");
  }

  let result = std::str::from_utf8(&writer.into_inner())
    .expect("Failed to convert a slice of bytes to a string slice")
    .to_string();

  result
}
