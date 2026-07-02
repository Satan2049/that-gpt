const SERVICE: &str = "ThatGPT";

fn entry(key: &str) -> Option<keyring::Entry> {
    keyring::Entry::new(SERVICE, key).ok()
}

pub fn get_secret(key: &str) -> Option<String> {
    entry(key)?.get_password().ok().filter(|value| !value.is_empty())
}

pub fn set_secret(key: &str, value: &str) -> bool {
    if value.is_empty() {
        return delete_secret(key);
    }
    entry(key)
        .and_then(|e| e.set_password(value).ok())
        .is_some()
}

pub fn delete_secret(key: &str) -> bool {
    match entry(key) {
        Some(e) => matches!(e.delete_credential(), Ok(()) | Err(keyring::Error::NoEntry)),
        None => true,
    }
}

pub fn provider_key(id: &str) -> String {
    format!("provider:{id}")
}
