use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use serde::{Deserialize, Serialize};

const INSTALL_HINT: &str =
    "请先安装依赖：在项目根执行 `pnpm run word-smart-doc:install`。";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateMeta {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub section_count: u32,
    #[serde(default)]
    pub has_thumbnail: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FillResult {
    pub results: Vec<FillItem>,
    pub logs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FillItem {
    pub input: String,
    pub output: String,
}

fn project_root_candidates() -> Vec<PathBuf> {
    let mut roots = Vec::new();
    if let Ok(v) = std::env::var("DOC_PILOT_ROOT") {
        if !v.trim().is_empty() {
            roots.push(PathBuf::from(v.trim()));
        }
    }
    roots.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(".."));
    if let Ok(cwd) = std::env::current_dir() {
        let mut dir = cwd.as_path();
        loop {
            roots.push(dir.to_path_buf());
            match dir.parent() {
                Some(p) => dir = p,
                None => break,
            }
        }
    }
    roots
}

fn venv_python(root: &Path) -> PathBuf {
    if cfg!(windows) {
        root.join(".venv").join("Scripts").join("python.exe")
    } else {
        root.join(".venv").join("bin").join("python3")
    }
}

fn resolve_python() -> Result<PathBuf, String> {
    if let Ok(bin) = std::env::var("DOC_PILOT_PYTHON") {
        let path = PathBuf::from(bin.trim());
        if path.is_file() {
            return Ok(path);
        }
    }
    for root in project_root_candidates() {
        let root = root.canonicalize().unwrap_or(root);
        let py = venv_python(&root);
        if py.is_file() {
            return Ok(py);
        }
    }
    for name in ["python3", "python"] {
        if Command::new(name).arg("--version").output().map(|o| o.status.success()).unwrap_or(false) {
            return Ok(PathBuf::from(name));
        }
    }
    Err(INSTALL_HINT.into())
}

fn script_path(name: &str) -> Result<PathBuf, String> {
    for root in project_root_candidates() {
        let root = root.canonicalize().unwrap_or(root);
        let s = root.join("scripts").join(name);
        if s.is_file() {
            return Ok(s);
        }
    }
    Err(format!("未找到 scripts/{name}"))
}

fn run_python(script: &str, payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let python = resolve_python()?;
    let script = script_path(script)?;
    let json = serde_json::to_string(&payload).map_err(|e| format!("序列化失败: {e}"))?;
    let output = Command::new(&python)
        .arg(&script)
        .arg(&json)
        .output()
        .map_err(|e| format!("无法启动脚本 ({e})。{INSTALL_HINT}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(stdout.trim()) {
        if v.get("ok").and_then(|b| b.as_bool()) == Some(true) {
            return Ok(v);
        }
        if let Some(e) = v.get("error").and_then(|s| s.as_str()) {
            return Err(e.to_string());
        }
    }
    let detail = if !stderr.trim().is_empty() { stderr.trim() } else { stdout.trim() };
    Err(format!("脚本执行失败: {detail}"))
}

fn gen_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let ts = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0);
    let rand = std::process::id();
    format!("tpl-{ts}-{rand}")
}

pub fn learn_template(library_dir: &Path, docx_path: &str, name: Option<String>, description: Option<String>) -> Result<TemplateMeta, String> {
    let id = gen_id();
    let dest = library_dir.join(&id);
    let v = run_python("word-smart-doc-learn.py", serde_json::json!({
        "docx_path": docx_path,
        "dest_dir": dest.to_string_lossy(),
    }))?;
    let meta_v = v.get("meta").cloned().unwrap_or_default();
    let mut meta: TemplateMeta = serde_json::from_value(serde_json::json!({
        "id": id,
        "name": name.unwrap_or_else(|| meta_v.get("name").and_then(|s| s.as_str()).unwrap_or("未命名模板").to_string()),
        "description": description.unwrap_or_default(),
        "section_count": meta_v.get("section_count").and_then(|n| n.as_u64()).unwrap_or(0),
        "has_thumbnail": meta_v.get("has_thumbnail").and_then(|b| b.as_bool()).unwrap_or(false),
    })).map_err(|e| format!("解析 meta 失败: {e}"))?;
    write_meta(&dest, &meta)?;
    meta.id = dest.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string();
    Ok(meta)
}

fn write_meta(dir: &Path, meta: &TemplateMeta) -> Result<(), String> {
    let path = dir.join("meta.json");
    let json = serde_json::json!({
        "name": meta.name,
        "description": meta.description,
        "section_count": meta.section_count,
        "has_thumbnail": meta.has_thumbnail,
    });
    fs::write(&path, serde_json::to_string_pretty(&json).unwrap_or_default())
        .map_err(|e| format!("写 meta.json 失败: {e}"))
}

pub fn list_templates(library_dir: &Path) -> Result<Vec<TemplateMeta>, String> {
    let mut out = Vec::new();
    if !library_dir.exists() {
        return Ok(out);
    }
    for entry in fs::read_dir(library_dir).map_err(|e| format!("读库失败: {e}"))?.flatten() {
        let dir = entry.path();
        if !dir.is_dir() {
            continue;
        }
        let meta_path = dir.join("meta.json");
        if !meta_path.is_file() {
            continue;
        }
        let raw = fs::read_to_string(&meta_path).unwrap_or_default();
        let v: serde_json::Value = serde_json::from_str(&raw).unwrap_or_default();
        out.push(TemplateMeta {
            id: dir.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string(),
            name: v.get("name").and_then(|s| s.as_str()).unwrap_or("未命名模板").to_string(),
            description: v.get("description").and_then(|s| s.as_str()).unwrap_or("").to_string(),
            section_count: v.get("section_count").and_then(|n| n.as_u64()).unwrap_or(0) as u32,
            has_thumbnail: v.get("has_thumbnail").and_then(|b| b.as_bool()).unwrap_or(false),
        });
    }
    Ok(out)
}

pub fn rename_template(library_dir: &Path, id: &str, name: &str) -> Result<(), String> {
    let dir = library_dir.join(id);
    let meta_path = dir.join("meta.json");
    let raw = fs::read_to_string(&meta_path).map_err(|e| format!("读 meta 失败: {e}"))?;
    let mut v: serde_json::Value = serde_json::from_str(&raw).map_err(|e| format!("解析 meta 失败: {e}"))?;
    v["name"] = serde_json::Value::String(name.to_string());
    fs::write(&meta_path, serde_json::to_string_pretty(&v).unwrap_or_default())
        .map_err(|e| format!("写 meta 失败: {e}"))
}

pub fn delete_template(library_dir: &Path, id: &str) -> Result<(), String> {
    let dir = library_dir.join(id);
    if dir.exists() {
        fs::remove_dir_all(&dir).map_err(|e| format!("删除失败: {e}"))?;
    }
    Ok(())
}

pub fn read_profile(library_dir: &Path, id: &str) -> Result<serde_json::Value, String> {
    let path = library_dir.join(id).join("profile.json");
    let raw = fs::read_to_string(&path).map_err(|e| format!("读 profile 失败: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("解析 profile 失败: {e}"))
}

pub fn update_profile(library_dir: &Path, id: &str, profile: serde_json::Value) -> Result<(), String> {
    let path = library_dir.join(id).join("profile.json");
    fs::write(&path, serde_json::to_string_pretty(&profile).unwrap_or_default())
        .map_err(|e| format!("写 profile 失败: {e}"))
}

#[allow(clippy::too_many_arguments)]
pub fn generate(
    library_dir: &Path,
    id: &str,
    output_path: &str,
    content_kind: &str,
    content_path: Option<String>,
    content_text: Option<String>,
    sections: Option<serde_json::Value>,
    reporter: Option<String>,
    report_date: Option<String>,
) -> Result<FillResult, String> {
    let template_dir = library_dir.join(id);
    if !template_dir.join("original.docx").is_file() {
        return Err("模板不存在或已损坏".into());
    }
    let v = run_python("word-smart-doc-fill.py", serde_json::json!({
        "template_dir": template_dir.to_string_lossy(),
        "output_path": output_path,
        "content_kind": content_kind,
        "content_path": content_path,
        "content_text": content_text,
        "sections": sections,
        "reporter": reporter,
        "report_date": report_date,
    }))?;
    let results = v.get("results").and_then(|r| serde_json::from_value(r.clone()).ok()).unwrap_or_default();
    let logs = v.get("logs").and_then(|l| serde_json::from_value(l.clone()).ok()).unwrap_or_default();
    Ok(FillResult { results, logs })
}
