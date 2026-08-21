pub fn hello() -> String {
    format!("Hello from {}", env!("CARGO_PKG_NAME"))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_hello() {
        assert!(hello().contains("sensorium"));
    }
}
