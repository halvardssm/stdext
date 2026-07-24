//! Content type detection for DOM parsing

/// Checks if the content type is HTML
pub fn is_html(content_type: &str) -> bool {
    let content_type_lower = content_type.to_lowercase();
    content_type_lower.contains("text/html") ||
    content_type_lower.contains("application/xhtml")
}

/// Checks if the content type is XML
pub fn is_xml(content_type: &str) -> bool {
    let content_type_lower = content_type.to_lowercase();
    content_type_lower.contains("text/xml") ||
    content_type_lower.contains("application/xml") ||
    content_type_lower.contains("image/svg+xml")
}
