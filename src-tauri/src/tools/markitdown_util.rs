use std::path::{Path, PathBuf};
use std::process::Command;
use tempfile::TempDir;

const INSTALL_HINT: &str = "请先安装 MarkItDown：在项目根执行 `pnpm run markitdown:install`，或使用已内置转换组件的正式版安装包。";

fn sidecar_binary_name() -> String {
    format!(
        "docpilot-convert-{}-{}",
        std::env::consts::ARCH,
        std::env::consts::OS
    )
}

/// 发布包内嵌的转换 sidecar（markitdown + OCR）
fn resolve_sidecar() -> Option<PathBuf> {
    if let Ok(p) = std::env::var("DOC_PILOT_CONVERT_SIDECAR") {
        let t = p.trim();
        if !t.is_empty() {
            let path = PathBuf::from(t);
            if path.is_file() {
                return Some(path);
            }
        }
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            for name in [sidecar_binary_name(), "docpilot-convert".to_string()] {
                let candidate = dir.join(&name);
                if candidate.is_file() {
                    return Some(candidate);
                }
            }
        }
    }

    let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("binaries")
        .join(sidecar_binary_name());
    if dev.is_file() {
        return Some(dev);
    }

    None
}

fn run_sidecar_convert(
    sidecar: &Path,
    input_path: &str,
    out_path: &str,
    use_plugins: bool,
) -> Result<ConvertMarkdownResult, String> {
    let mut cmd = Command::new(sidecar);
    cmd.arg(input_path).arg("-o").arg(out_path);
    if use_plugins {
        cmd.arg("--use-plugins");
    }

    let output = cmd
        .output()
        .map_err(|e| format!("无法启动内置转换组件 ({e})"))?;

    let stderr = String::from_utf8_lossy(&output.stderr);
    let used_ocr = stderr.contains("docpilot:used_ocr=1");

    if !output.status.success() {
        let detail = if !stderr.trim().is_empty() {
            stderr.trim().to_string()
        } else {
            String::from_utf8_lossy(&output.stdout).trim().to_string()
        };
        return Err(if detail.is_empty() {
            format!("内置转换失败（退出码 {:?}）", output.status.code())
        } else {
            format!("内置转换失败: {detail}")
        });
    }

    let markdown = std::fs::read_to_string(out_path)
        .map_err(|e| format!("读取输出 Markdown 失败: {e}"))?;
    if markdown.trim().is_empty() {
        return Err("内置转换结果为空".into());
    }

    Ok(ConvertMarkdownResult {
        char_count: markdown.chars().count(),
        markdown,
        output_path: out_path.to_string(),
        used_ocr,
    })
}

#[derive(Debug, Clone)]
struct MarkitdownCommand {
    program: String,
    prefix_args: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct ConvertMarkdownResult {
    pub markdown: String,
    pub output_path: String,
    pub char_count: usize,
    /// markitdown 无文本时走 OCR 回退（扫描 PDF / 图片）
    pub used_ocr: bool,
}

const IMAGE_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff", "heic",
];

fn is_pdf(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case("pdf"))
        .unwrap_or(false)
}

fn is_raster_image(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|ext| {
            IMAGE_EXTENSIONS
                .iter()
                .any(|s| ext.eq_ignore_ascii_case(s))
        })
        .unwrap_or(false)
}

fn supports_ocr_fallback(path: &Path) -> bool {
    is_pdf(path) || is_raster_image(path)
}

fn command_available(name: &str) -> bool {
    Command::new(name)
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
        || Command::new(name)
            .arg("-v")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
}

fn tesseract_lang() -> &'static str {
    let out = Command::new("tesseract").arg("--list-langs").output();
    let list = out
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
        .unwrap_or_default();
    if list.contains("chi_sim") {
        "chi_sim+eng"
    } else {
        "eng"
    }
}

fn ensure_tesseract() -> Result<(), String> {
    if command_available("tesseract") {
        Ok(())
    } else {
        Err("未找到 tesseract，请安装：brew install tesseract".into())
    }
}

fn tesseract_read_image(image_path: &Path) -> Result<String, String> {
    ensure_tesseract()?;
    let lang = tesseract_lang();
    let ocr = Command::new("tesseract")
        .arg(image_path)
        .arg("stdout")
        .arg("-l")
        .arg(lang)
        .output()
        .map_err(|e| format!("无法运行 tesseract: {e}"))?;
    if !ocr.status.success() {
        let err = String::from_utf8_lossy(&ocr.stderr);
        return Err(format!("tesseract OCR 失败: {}", err.trim()));
    }
    Ok(String::from_utf8_lossy(&ocr.stdout).trim().to_string())
}

fn write_markdown_output(out_path: &str, text: &str) -> Result<String, String> {
    if text.is_empty() {
        return Err(
            "OCR 未识别到文字。可安装中文语言包：brew install tesseract-lang，或确认文件内容清晰。"
                .into(),
        );
    }
    std::fs::write(out_path, text).map_err(|e| format!("写入 Markdown 失败: {e}"))?;
    Ok(text.to_string())
}

/// PNG/JPG 等：直接 tesseract OCR
fn ocr_image_to_markdown(input_path: &str, out_path: &str) -> Result<String, String> {
    let text = tesseract_read_image(Path::new(input_path))?;
    write_markdown_output(out_path, &text)
}

/// 扫描件 PDF：pdftoppm + tesseract（需本机已安装 poppler、tesseract）
fn ocr_pdf_to_markdown(input_path: &str, out_path: &str) -> Result<String, String> {
    if !command_available("pdftoppm") {
        return Err(
            "未找到 pdftoppm，请安装 Poppler：brew install poppler".into(),
        );
    }
    ensure_tesseract()?;

    let tmp = TempDir::new().map_err(|e| format!("创建临时目录失败: {e}"))?;
    let prefix = tmp.path().join("page");
    let prefix_str = prefix.to_string_lossy();

    let ppm = Command::new("pdftoppm")
        .args(["-png", "-r", "200", input_path, prefix_str.as_ref()])
        .output()
        .map_err(|e| format!("无法运行 pdftoppm: {e}"))?;
    if !ppm.status.success() {
        let err = String::from_utf8_lossy(&ppm.stderr);
        return Err(format!("pdftoppm 失败: {}", err.trim()));
    }

    let mut pages: Vec<PathBuf> = std::fs::read_dir(tmp.path())
        .map_err(|e| format!("读取临时页图失败: {e}"))?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| {
            p.extension()
                .and_then(|x| x.to_str())
                .map(|x| x.eq_ignore_ascii_case("png"))
                .unwrap_or(false)
        })
        .collect();
    pages.sort();

    if pages.is_empty() {
        return Err("pdftoppm 未生成页图".into());
    }

    let multi_page = pages.len() > 1;
    let mut markdown = String::new();

    for (i, page) in pages.iter().enumerate() {
        let text = tesseract_read_image(page)?;
        if multi_page {
            markdown.push_str(&format!("\n\n## 第 {} 页\n\n", i + 1));
        }
        markdown.push_str(&text);
        if multi_page && i + 1 < pages.len() {
            markdown.push('\n');
        }
    }

    write_markdown_output(out_path, markdown.trim())
}

fn ocr_fallback(input_path: &str, out_path: &str, input: &Path) -> Result<String, String> {
    if is_pdf(input) {
        ocr_pdf_to_markdown(input_path, out_path)
    } else if is_raster_image(input) {
        ocr_image_to_markdown(input_path, out_path)
    } else {
        Err("不支持 OCR 回退的文件类型".into())
    }
}

/// 可能的项目根目录（Tauri 运行时 cwd 常为 src-tauri，需向上查找）
fn project_root_candidates() -> Vec<PathBuf> {
    let mut roots: Vec<PathBuf> = Vec::new();

    if let Ok(v) = std::env::var("DOC_PILOT_ROOT") {
        let t = v.trim();
        if !t.is_empty() {
            roots.push(PathBuf::from(t));
        }
    }

    // 编译期：crate 位于 src-tauri，上一级为仓库根
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

fn venv_markitdown_bin(root: &Path) -> PathBuf {
    if cfg!(windows) {
        root.join(".venv").join("Scripts").join("markitdown.exe")
    } else {
        root.join(".venv").join("bin").join("markitdown")
    }
}

fn venv_python_bin(root: &Path) -> PathBuf {
    if cfg!(windows) {
        root.join(".venv").join("Scripts").join("python.exe")
    } else {
        root.join(".venv").join("bin").join("python3")
    }
}

fn try_project_venv() -> Option<MarkitdownCommand> {
    for root in project_root_candidates() {
        let root = root.canonicalize().unwrap_or(root);
        let bin = venv_markitdown_bin(&root);
        if bin.is_file() {
            let p = bin.to_string_lossy().into_owned();
            return Some(MarkitdownCommand {
                program: p,
                prefix_args: vec![],
            });
        }
        let py = venv_python_bin(&root);
        if py.is_file() {
            let prefix = vec!["-m".into(), "markitdown".into()];
            let program = py.to_string_lossy().into_owned();
            if command_works(&program, &prefix) {
                return Some(MarkitdownCommand {
                    program,
                    prefix_args: prefix,
                });
            }
        }
    }
    None
}

fn command_works(program: &str, prefix_args: &[String]) -> bool {
    let mut cmd = Command::new(program);
    for a in prefix_args {
        cmd.arg(a);
    }
    cmd.arg("--version");
    cmd.output().map(|o| o.status.success()).unwrap_or(false)
}

fn resolve_markitdown_command() -> Result<MarkitdownCommand, String> {
    if let Ok(bin) = std::env::var("MARKITDOWN_BIN") {
        let p = bin.trim().to_string();
        if !p.is_empty() && command_works(&p, &[]) {
            return Ok(MarkitdownCommand {
                program: p,
                prefix_args: vec![],
            });
        }
    }

    if let Some(cmd) = try_project_venv() {
        return Ok(cmd);
    }

    if command_works("markitdown", &[]) {
        return Ok(MarkitdownCommand {
            program: "markitdown".into(),
            prefix_args: vec![],
        });
    }

    for py in ["python3", "python"] {
        let prefix = vec!["-m".into(), "markitdown".into()];
        if command_works(py, &prefix) {
            return Ok(MarkitdownCommand {
                program: py.into(),
                prefix_args: prefix,
            });
        }
    }

    Err(INSTALL_HINT.into())
}

fn default_output_path(input_path: &str) -> Result<String, String> {
    let p = Path::new(input_path);
    let parent = p
        .parent()
        .filter(|d| !d.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    let stem = p
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or_else(|| format!("无法从路径推导输出文件名: {input_path}"))?;
    Ok(parent.join(format!("{stem}.md")).to_string_lossy().into_owned())
}

/// 规范化输出路径：相对路径相对输入文件目录；修复「目录 + 完整路径」重复拼接
fn resolve_output_path(input_path: &str, output_path: Option<&str>) -> Result<String, String> {
    let input = Path::new(input_path);
    let parent = input
        .parent()
        .filter(|d| !d.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));

    let out = match output_path {
        Some(p) if !p.trim().is_empty() => p.trim().to_string(),
        _ => return default_output_path(input_path),
    };

    let path = Path::new(&out);
    let mut resolved = if path.is_absolute() {
        path.to_path_buf()
    } else {
        parent.join(path)
    };

    if let (Some(parent_str), Some(res_str)) = (parent.to_str(), resolved.to_str()) {
        let parent_norm = parent_str.trim_end_matches('/');
        for prefix in [
            format!("{parent_norm}//{parent_norm}/"),
            format!("{parent_norm}/{parent_norm}/"),
        ] {
            if let Some(rest) = res_str.strip_prefix(&prefix) {
                resolved = PathBuf::from(format!("{parent_norm}/{rest}"));
                break;
            }
        }
    }

    Ok(resolved.to_string_lossy().into_owned())
}

pub fn convert_to_markdown(
    input_path: &str,
    output_path: Option<&str>,
    use_plugins: bool,
) -> Result<ConvertMarkdownResult, String> {
    let input = Path::new(input_path);
    if !input.exists() {
        return Err(format!("路径不存在: {input_path}"));
    }
    if input.is_dir() {
        return Err("暂不支持目录，请选择单个文件".into());
    }

    let out_path = resolve_output_path(input_path, output_path)?;

    if let Some(parent) = Path::new(&out_path).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("无法创建输出目录: {e}"))?;
    }

    if Path::new(&out_path).exists() {
        return Err(format!("输出文件已存在: {out_path}"));
    }

    if let Some(sidecar) = resolve_sidecar() {
        return run_sidecar_convert(&sidecar, input_path, &out_path, use_plugins);
    }

    let runner = resolve_markitdown_command()?;

    let mut cmd = Command::new(&runner.program);
    for a in &runner.prefix_args {
        cmd.arg(a);
    }
    if use_plugins {
        cmd.arg("--use-plugins");
    }
    cmd.arg(input_path).arg("-o").arg(&out_path);

    let output = cmd
        .output()
        .map_err(|e| format!("无法启动 markitdown ({e})。{INSTALL_HINT}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        let detail = if !stderr.trim().is_empty() {
            stderr.trim().to_string()
        } else {
            stdout.trim().to_string()
        };
        return Err(if detail.is_empty() {
            format!("markitdown 转换失败（退出码 {:?}）", output.status.code())
        } else {
            format!("markitdown 转换失败: {detail}")
        });
    }

    let mut markdown = std::fs::read_to_string(&out_path)
        .map_err(|e| format!("读取输出 Markdown 失败: {e}"))?;
    let mut used_ocr = false;

    if markdown.trim().is_empty() && supports_ocr_fallback(input) {
        markdown = ocr_fallback(input_path, &out_path, input)?;
        used_ocr = true;
    }

    if markdown.trim().is_empty() {
        return Err(
            "转换结果为空。图片/扫描 PDF 需 OCR：请安装 tesseract（brew install tesseract）；PDF 另需 poppler（brew install poppler）。"
                .into(),
        );
    }

    let char_count = markdown.chars().count();

    Ok(ConvertMarkdownResult {
        markdown,
        output_path: out_path,
        char_count,
        used_ocr,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_output_path_adds_md_suffix() {
        let out = default_output_path("/tmp/report.pdf").unwrap();
        assert!(out.ends_with("report.md"));
    }

    #[test]
    fn resolve_output_path_fixes_doubled_parent_prefix() {
        let input = "/tmp/dir/report.pdf";
        let doubled = "/tmp/dir//tmp/dir/out.md";
        let out = resolve_output_path(input, Some(doubled)).unwrap();
        assert_eq!(out, "/tmp/dir/out.md");
    }

    #[test]
    fn resolve_output_path_joins_relative_name() {
        let out = resolve_output_path("/tmp/dir/report.pdf", Some("out.md")).unwrap();
        assert_eq!(out, "/tmp/dir/out.md");
    }

    #[test]
    fn finds_venv_markitdown_from_manifest_dir() {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
        let bin = venv_markitdown_bin(&root);
        if bin.is_file() {
            let cmd = try_project_venv().expect("应能解析项目 .venv 中的 markitdown");
            assert!(cmd.program.contains("markitdown") || cmd.prefix_args.contains(&"markitdown".into()));
        }
    }
}
