use rand::{distributions::Alphanumeric, thread_rng, Rng};

pub fn random_dir_name() -> String {
  let name: String = thread_rng()
    .sample_iter(&Alphanumeric)
    .take(20)
    .map(char::from)
    .collect();

  format!("empece-{}", name)
}
