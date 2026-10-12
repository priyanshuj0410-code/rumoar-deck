scale = {k: int(v) for k, v in re.findall(r"--text-([a-z]+):\s*(\d+)px", css)}
    ("framework defaults reset (--text-*: initial)", "--text-*: initial" in css),
