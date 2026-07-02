fn parse_version(value: &str) -> Option<(u64, u64, u64)> {
    let core = value.split('-').next()?.trim().trim_start_matches('v');
    let mut parts = core.split('.');
    let major = parts.next()?.parse().ok()?;
    let minor = parts.next()?.parse().ok()?;
    let patch = parts.next()?.parse().ok()?;
    Some((major, minor, patch))
}

pub fn is_newer_version(latest: &str, current: &str) -> bool {
    match (parse_version(latest), parse_version(current)) {
        (Some(l), Some(c)) => l > c,
        _ => !latest.is_empty() && latest != current,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compares_semver_versions() {
        assert!(is_newer_version("2.6.1", "2.6.0"));
        assert!(!is_newer_version("2.6.0", "2.6.1"));
        assert!(!is_newer_version("2.6.1", "2.6.1"));
        assert!(is_newer_version("v3.0.0", "2.6.1"));
    }
}
