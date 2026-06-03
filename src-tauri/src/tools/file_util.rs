use md5::{Digest as Md5Digest, Md5};
use sha2::Sha256;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, serde::Serialize)]
pub struct FileInfo {
    pub path: String,
    pub file_name: String,
    pub size: u64,
    pub is_dir: bool,
    pub extension: Option<String>,
}

pub fn get_file_info(path: &str) -> Result<FileInfo, String> {
    let p = Path::new(path);
    if !p.exists() {
        return Err(format!("路径不存在: {path}"));
    }
    let meta = fs::metadata(p).map_err(|e| format!("读取元数据失败: {e}"))?;
    let file_name = p
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
    let extension = p
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase());
    Ok(FileInfo {
        path: path.to_string(),
        file_name,
        size: meta.len(),
        is_dir: meta.is_dir(),
        extension,
    })
}

pub fn copy_file(src: &str, dest: &str) -> Result<u64, String> {
    if !Path::new(src).exists() {
        return Err(format!("源文件不存在: {src}"));
    }
    if Path::new(dest).exists() {
        return Err(format!("目标已存在: {dest}"));
    }
    let bytes = fs::copy(src, dest).map_err(|e| format!("复制失败: {e}"))?;
    Ok(bytes)
}

pub fn move_file(src: &str, dest: &str) -> Result<(), String> {
    if !Path::new(src).exists() {
        return Err(format!("源文件不存在: {src}"));
    }
    if Path::new(dest).exists() {
        return Err(format!("目标已存在: {dest}"));
    }
    fs::rename(src, dest).or_else(|_| {
        copy_file(src, dest)?;
        fs::remove_file(src).map_err(|e| format!("删除源文件失败: {e}"))
    })
    .map_err(|e| format!("移动失败: {e}"))
}

pub fn compute_hash(path: &str, algorithm: &str) -> Result<String, String> {
    if !Path::new(path).exists() {
        return Err(format!("文件不存在: {path}"));
    }
    let data = fs::read(path).map_err(|e| format!("读取文件失败: {e}"))?;
    match algorithm.to_lowercase().as_str() {
        "md5" => Ok(format!("{:x}", Md5::digest(&data))),
        "sha256" => Ok(hex::encode(Sha256::digest(&data))),
        other => Err(format!("不支持的算法: {other}（可用 md5 / sha256）")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_info_and_hash() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.txt");
        fs::write(&path, b"hello").unwrap();
        let p = path.to_str().unwrap();
        let info = get_file_info(p).unwrap();
        assert_eq!(info.size, 5);
        assert_eq!(info.extension, Some("txt".to_string()));
        let md5 = compute_hash(p, "md5").unwrap();
        assert_eq!(md5.len(), 32);
    }

    #[test]
    fn copy_and_move() {
        let dir = tempfile::tempdir().unwrap();
        let src = dir.path().join("a.txt");
        let copy = dir.path().join("b.txt");
        let moved = dir.path().join("c.txt");
        fs::write(&src, b"x").unwrap();
        copy_file(src.to_str().unwrap(), copy.to_str().unwrap()).unwrap();
        assert!(copy.exists());
        move_file(copy.to_str().unwrap(), moved.to_str().unwrap()).unwrap();
        assert!(moved.exists());
        assert!(!copy.exists());
    }
}
