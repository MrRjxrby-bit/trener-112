import language_tool_python

_tool = language_tool_python.LanguageTool("ru-RU")

def check(text: str) -> dict:
    matches = _tool.check(text)
    return {
        "ok": len(matches) == 0,
        "issues": [
            {"message": m.message, "offset": m.offset, "length": m.error_length,
             "replacements": m.replacements[:3]}
            for m in matches
        ],
    }