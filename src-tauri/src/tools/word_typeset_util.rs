use std::path::{Path, PathBuf};
use std::process::Command;

const INSTALL_HINT: &str =
    "请先安装 Word 排版依赖：在项目根执行 `node scripts/ensure-word-typeset.mjs`。";

fn project_root_candidates() -> Vec<PathBuf> {
    let mut roots: Vec<PathBuf> = Vec::new();

    if let Ok(v) = std::env::var("DOC_PILOT_ROOT") {
        let t = v.trim();
        if !t.is_empty() {
            roots.push(PathBuf::from(t));
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

fn venv_python_bin(root: &Path) -> PathBuf {
    if cfg!(windows) {
        root.join(".venv").join("Scripts").join("python.exe")
    } else {
        root.join(".venv").join("bin").join("python3")
    }
}

fn resolve_python() -> Result<PathBuf, String> {
    if let Ok(bin) = std::env::var("DOC_PILOT_PYTHON") {
        let p = bin.trim();
        if !p.is_empty() {
            let path = PathBuf::from(p);
            if path.is_file() {
                return Ok(path);
            }
        }
    }

    for root in project_root_candidates() {
        let root = root.canonicalize().unwrap_or(root);
        let py = venv_python_bin(&root);
        if py.is_file() {
            return Ok(py);
        }
    }

    for name in ["python3", "python"] {
        let ok = Command::new(name)
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);
        if ok {
            return Ok(PathBuf::from(name));
        }
    }

    Err(INSTALL_HINT.into())
}

fn script_path() -> Result<PathBuf, String> {
    for root in project_root_candidates() {
        let root = root.canonicalize().unwrap_or(root);
        let script = root.join("scripts").join("word-typeset.py");
        if script.is_file() {
            return Ok(script);
        }
    }
    Err("未找到 scripts/word-typeset.py".into())
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TypesetFileResult {
    pub input: String,
    pub output: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TypesetBatchResult {
    pub results: Vec<TypesetFileResult>,
    pub logs: Vec<String>,
}

pub fn run_word_typeset(payload: serde_json::Value) -> Result<TypesetBatchResult, String> {
    let python = resolve_python()?;
    let script = script_path()?;
    let json = serde_json::to_string(&payload).map_err(|e| format!("序列化配置失败: {e}"))?;

    let output = Command::new(&python)
        .arg(&script)
        .arg(&json)
        .output()
        .map_err(|e| format!("无法启动 Word 排版脚本 ({e})。{INSTALL_HINT}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(stdout.trim()) {
        if parsed.get("ok").and_then(|v| v.as_bool()) == Some(true) {
            let results: Vec<TypesetFileResult> = parsed
                .get("results")
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .unwrap_or_default();
            let logs: Vec<String> = parsed
                .get("logs")
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .unwrap_or_default();
            return Ok(TypesetBatchResult { results, logs });
        }
        if let Some(err) = parsed.get("error").and_then(|v| v.as_str()) {
            return Err(err.to_string());
        }
    }

    let detail = if !stderr.trim().is_empty() {
        stderr.trim().to_string()
    } else {
        stdout.trim().to_string()
    };

    Err(if detail.is_empty() {
        format!("Word 排版失败（退出码 {:?}）", output.status.code())
    } else {
        format!("Word 排版失败: {detail}")
    })
}
