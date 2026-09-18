# ============================================================
#  左文科技 商用授权码生成工具（图形界面版）
#  双击同目录「授权码生成工具.bat」即可启动
#  依赖：仅需本机已安装 Node.js（生成/验签逻辑复用 license-cli.js）
#  私钥：scripts/license-keys/private.pem（请勿外发）
# ============================================================
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName Microsoft.VisualBasic

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir   = Split-Path -Parent $scriptDir

# ---------- 调用底层 CLI（node） ----------
function Run-Cli([string]$cliArgs) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "node"
  $psi.Arguments = "`"$scriptDir\license-cli.js`" $cliArgs"
  $psi.WorkingDirectory = $rootDir
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  try {
    $p = [System.Diagnostics.Process]::Start($psi)
  } catch {
    return @{ Out = ""; Err = "无法启动 Node.js，请先安装并确认 node 命令可用：$($_.Exception.Message)"; Exit = 1 }
  }
  $out = $p.StandardOutput.ReadToEnd()
  $err = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  return @{ Out = $out; Err = $err; Exit = $p.ExitCode }
}

function Get-LicenseCode([string]$output) {
  if ($output -match "(?s)========== 授权码 ==========\s*\r?\n(.+?)\r?\n\s*====") {
    return $matches[1].Trim()
  }
  return ""
}

# ---------- 窗体 ----------
$form = New-Object System.Windows.Forms.Form
$form.Text = "左文科技 - 商用授权码生成工具"
$form.Size = New-Object System.Drawing.Size(780, 640)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedSingle"
$form.MaximizeBox = $false
$form.Font = New-Object System.Drawing.Font("Microsoft YaHei", 9)

# 客户
$lblCid = New-Object System.Windows.Forms.Label
$lblCid.Text = "客户标识（公司名，必填）："
$lblCid.Location = New-Object System.Drawing.Point(20, 18)
$lblCid.Size = New-Object System.Drawing.Size(180, 24)
$txtCid = New-Object System.Windows.Forms.TextBox
$txtCid.Location = New-Object System.Drawing.Point(210, 15)
$txtCid.Size = New-Object System.Drawing.Size(530, 24)

# 域名
$lblDomain = New-Object System.Windows.Forms.Label
$lblDomain.Text = "绑定域名（逗号分隔，空=不限）："
$lblDomain.Location = New-Object System.Drawing.Point(20, 52)
$lblDomain.Size = New-Object System.Drawing.Size(180, 24)
$txtDomain = New-Object System.Windows.Forms.TextBox
$txtDomain.Location = New-Object System.Drawing.Point(210, 49)
$txtDomain.Size = New-Object System.Drawing.Size(530, 24)

# 版本
$lblEdition = New-Object System.Windows.Forms.Label
$lblEdition.Text = "版本："
$lblEdition.Location = New-Object System.Drawing.Point(20, 86)
$lblEdition.Size = New-Object System.Drawing.Size(180, 24)
$comboEdition = New-Object System.Windows.Forms.ComboBox
$comboEdition.Location = New-Object System.Drawing.Point(210, 83)
$comboEdition.Size = New-Object System.Drawing.Size(160, 24)
$comboEdition.DropDownStyle = "DropDownList"
[void]$comboEdition.Items.Add("trial（30天试用）")
[void]$comboEdition.Items.Add("pro（专业版）")
[void]$comboEdition.Items.Add("enterprise（企业版）")
$comboEdition.SelectedIndex = 1

# 有效期
$lblExp = New-Object System.Windows.Forms.Label
$lblExp.Text = "有效期："
$lblExp.Location = New-Object System.Drawing.Point(400, 86)
$lblExp.Size = New-Object System.Drawing.Size(120, 24)
$txtExp = New-Object System.Windows.Forms.TextBox
$txtExp.Location = New-Object System.Drawing.Point(530, 83)
$txtExp.Size = New-Object System.Drawing.Size(210, 24)
$txtExp.Text = "2027-12-31"

$lblExpTip = New-Object System.Windows.Forms.Label
$lblExpTip.Text = "格式：permanent（永久）/ 30d（30天）/ 2027-12-31（具体日期）"
$lblExpTip.Location = New-Object System.Drawing.Point(210, 108)
$lblExpTip.Size = New-Object System.Drawing.Size(530, 18)
$lblExpTip.ForeColor = [System.Drawing.Color]::Gray

# 站点数
$lblSeats = New-Object System.Windows.Forms.Label
$lblSeats.Text = "授权站点数："
$lblSeats.Location = New-Object System.Drawing.Point(20, 132)
$lblSeats.Size = New-Object System.Drawing.Size(180, 24)
$txtSeats = New-Object System.Windows.Forms.TextBox
$txtSeats.Location = New-Object System.Drawing.Point(210, 129)
$txtSeats.Size = New-Object System.Drawing.Size(80, 24)
$txtSeats.Text = "1"

# 生成按钮
$btnGen = New-Object System.Windows.Forms.Button
$btnGen.Text = "生成授权码"
$btnGen.Location = New-Object System.Drawing.Point(20, 168)
$btnGen.Size = New-Object System.Drawing.Size(130, 34)
$btnGen.BackColor = [System.Drawing.Color]::FromArgb(24, 144, 255)
$btnGen.ForeColor = [System.Drawing.Color]::White
$btnGen.FlatStyle = "Flat"

# 复制按钮
$btnCopy = New-Object System.Windows.Forms.Button
$btnCopy.Text = "复制授权码"
$btnCopy.Location = New-Object System.Drawing.Point(160, 168)
$btnCopy.Size = New-Object System.Drawing.Size(110, 34)

# 验证按钮
$btnVerify = New-Object System.Windows.Forms.Button
$btnVerify.Text = "验证授权码"
$btnVerify.Location = New-Object System.Drawing.Point(280, 168)
$btnVerify.Size = New-Object System.Drawing.Size(110, 34)

# 查看记录按钮
$btnList = New-Object System.Windows.Forms.Button
$btnList.Text = "查看签发记录"
$btnList.Location = New-Object System.Drawing.Point(400, 168)
$btnList.Size = New-Object System.Drawing.Size(110, 34)

# 授权码显示
$lblCode = New-Object System.Windows.Forms.Label
$lblCode.Text = "授权码（可直接复制）："
$lblCode.Location = New-Object System.Drawing.Point(20, 214)
$lblCode.Size = New-Object System.Drawing.Size(300, 22)
$txtCode = New-Object System.Windows.Forms.TextBox
$txtCode.Location = New-Object System.Drawing.Point(20, 238)
$txtCode.Size = New-Object System.Drawing.Size(720, 60)
$txtCode.Multiline = $true
$txtCode.ScrollBars = "Vertical"
$txtCode.ReadOnly = $true

# 输出区
$lblOut = New-Object System.Windows.Forms.Label
$lblOut.Text = "运行结果："
$lblOut.Location = New-Object System.Drawing.Point(20, 306)
$lblOut.Size = New-Object System.Drawing.Size(300, 22)
$txtOut = New-Object System.Windows.Forms.TextBox
$txtOut.Location = New-Object System.Drawing.Point(20, 330)
$txtOut.Size = New-Object System.Drawing.Size(720, 260)
$txtOut.Multiline = $true
$txtOut.ScrollBars = "Vertical"
$txtOut.ReadOnly = $true
$txtOut.BackColor = [System.Drawing.Color]::White

# ---------- 事件 ----------
$btnGen.Add_Click({
  $cid = $txtCid.Text.Trim()
  if (-not $cid) { [void][System.Windows.Forms.MessageBox]::Show("请填写客户标识（公司名）", "提示") ; return }
  $editionMap = @{ "trial（30天试用）" = "trial"; "pro（专业版）" = "pro"; "enterprise（企业版）" = "enterprise" }
  $edition = $editionMap[$comboEdition.SelectedItem]
  $exp = $txtExp.Text.Trim()
  if (-not $exp) { $exp = "permanent" }
  $seats = $txtSeats.Text.Trim()
  if (-not $seats) { $seats = "1" }
  $cliArgs = "--cid `"$cid`" --edition $edition --exp $exp --seats $seats"
  if ($txtDomain.Text.Trim()) { $cliArgs += " --domain $($txtDomain.Text.Trim())" }
  $btnGen.Enabled = $false
  $btnGen.Text = "生成中..."
  try {
    $r = Run-Cli $cliArgs
    $txtOut.Text = if ($r.Err) { $r.Err } else { $r.Out }
    if ($r.Exit -eq 0) {
      $code = Get-LicenseCode $r.Out
      $txtCode.Text = $code
      if (-not $code) { $txtOut.Text += "`r`n`r`n（未解析到授权码，请检查上方输出）" }
    } else {
      $txtCode.Text = ""
    }
  } finally {
    $btnGen.Enabled = $true
    $btnGen.Text = "生成授权码"
  }
})

$btnCopy.Add_Click({
  if (-not $txtCode.Text) { [void][System.Windows.Forms.MessageBox]::Show("请先生成授权码", "提示"); return }
  [System.Windows.Forms.Clipboard]::SetText($txtCode.Text.Trim())
  [void][System.Windows.Forms.MessageBox]::Show("授权码已复制，可直接粘贴发给客户", "已复制")
})

$btnVerify.Add_Click({
  $code = $txtCode.Text.Trim()
  if (-not $code) {
    $inputCode = [Microsoft.VisualBasic.Interaction]::InputBox("粘贴要验证的授权码：", "验证授权码", "")
    if ($inputCode) { $code = $inputCode.Trim() }
  }
  if (-not $code) { [void][System.Windows.Forms.MessageBox]::Show("没有可验证的授权码", "提示"); return }
  $r = Run-Cli "verify `"$code`""
  $txtOut.Text = if ($r.Err) { $r.Err } else { $r.Out }
})

$btnList.Add_Click({
  $r = Run-Cli "list"
  $txtOut.Text = if ($r.Err) { $r.Err } else { $r.Out }
})

# ---------- 组装 ----------
$form.Controls.AddRange(@($lblCid, $txtCid, $lblDomain, $txtDomain, $lblEdition, $comboEdition, $lblExp, $txtExp, $lblExpTip, $lblSeats, $txtSeats, $btnGen, $btnCopy, $btnVerify, $btnList, $lblCode, $txtCode, $lblOut, $txtOut))

$form.Add_Shown({
  $txtCid.Focus()
  $txtOut.Text = "欢迎使用商用授权码生成工具`r`n`r`n使用方法：`r`n1. 填写客户标识、绑定域名、版本、有效期、站点数`r`n2. 点击「生成授权码」`r`n3. 点击「复制授权码」发给客户，客户在后台「系统部署 → 授权管理」粘贴激活`r`n`r`n提示：trial 版本用于首次 30 天试用，正式合作请签发 pro / enterprise。"
})

[void]$form.ShowDialog()
