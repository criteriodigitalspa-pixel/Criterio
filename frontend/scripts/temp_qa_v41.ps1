$ErrorActionPreference = 'Stop' 
try { 
    $scriptPath = 'C:\Users\diego\.gemini\antigravity\scratch\frontend\scripts\'; $errFile = 'C:\Users\diego\.gemini\antigravity\scratch\frontend\scripts\error_log.txt'; $logoFile = 'C:\Users\diego\.gemini\antigravity\scratch\frontend\scripts\temp_logo.b64' 
    Add-Type -AssemblyName System.Windows.Forms 
    Add-Type -AssemblyName System.Drawing 
    try { Add-Type -AssemblyName System.Speech } catch {} 
    $BATTXML = 'C:\Users\diego\AppData\Local\Temp\batt_temp_24135.xml' 
 
    # --- THREAD SAFE STORAGE --- 
    $syncHash = [hashtable]::Synchronized(@{}) 
    $syncHash.Status = "Scanning..." 
 
    # --- HARDWARE SCANNER LOGIC --- 
    $scriptBlock = { 
        param($res, $battXml) 
        try { 
            $res.Log = "Iniciando..."; 
            try { $bios = Get-CimInstance Win32_BIOS; $res.Serial = $bios.SerialNumber } catch { $res.Serial = "Error" } 
            try { $cs = Get-CimInstance Win32_ComputerSystem; $res.Brand=$cs.Manufacturer; $res.Model=$cs.Model } catch { $res.Brand="Gen"; $res.Model="Gen" } 
            try { $res.UUID = (Get-CimInstance Win32_ComputerSystemProduct).UUID } catch { $res.UUID = "Error" } 
            try { $cpu = Get-CimInstance Win32_Processor; $ghz = [math]::Round($cpu.MaxClockSpeed / 1000, 2); $res.CPU = "$($cpu.Name) (Max $ghz GHz)" } catch { $res.CPU = "Error CPU" } 
            # RAM 
            try { $res.RamGB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory/1GB) } catch { $res.RamGB = "?" } 
            try { $rLog=@(); Get-CimInstance Win32_PhysicalMemory | ForEach{$gb=[math]::Round($_.Capacity/1GB); $rLog+="$gb GB @ $($_.Speed)MHz"}; $res.RamDet = $rLog -join ' + ' } catch { $res.RamDet = "Error" } 
            # DISKS 
            try { 
                $dLog=@() 
                $disks = Get-PhysicalDisk | Sort DeviceId 
                if($disks){ $disks | ForEach{$gb=[math]::Round($_.Size/1GB); $dLog+="- $($_.FriendlyName) ($gb GB) [$($_.MediaType)]"} } 
                else { Get-CimInstance Win32_DiskDrive | ForEach{$gb=[math]::Round($_.Size/1GB); $dLog+="- $($_.Model) ($gb GB)"} } 
                $res.Disks = $dLog 
            } catch { $res.Disks = "Error Disk" } 
            # GPU V40 (Fix: MB/GB + Integ check) 
            try { 
                $gLog=@() 
                Get-CimInstance Win32_VideoController | ForEach { 
                    $ram = $_.AdapterRAM 
                    $name = $_.Name 
                    $vramStr = "" 
                    if ($ram -ge 1GB) { 
                        $val = [math]::Round($ram / 1GB, 2) 
                        $vramStr = "$val GB" 
                    } elseif ($ram -gt 0) { 
                        $val = [math]::Round($ram / 1MB, 0) 
                        $vramStr = "$val MB" 
                    } else { 
                        $vramStr = "Compartida" 
                    } 
                    # Determine Integ 
                    if ($name -match "Intel" -or $name -match "Iris" -or $name -match "UHD" -or $name -match "Radeon.*Graphics") { 
                        $vramStr = "$vramStr (Integrada)" 
                    } 
                    $gLog += "$name (VRAM: $vramStr)" 
                } 
                $res.GPU = $gLog 
            } catch { $res.GPU = "Error GPU" } 
            # LICENSES (Fix: Object Select) 
            try { 
                $os=Get-CimInstance Win32_OperatingSystem; $res.OS=$os.Caption; $res.WinStat="?"; $res.Office="No" 
                $l=Get-CimInstance SoftwareLicensingProduct | Where{$_.PartialProductKey -and $_.Name -like "*Windows*"} | Select -First 1; if($l.LicenseStatus -eq 1){$res.WinStat="ACTIVADO"}else{$res.WinStat="NO (Estado: $($l.LicenseStatus))"} 
                $o=Get-CimInstance SoftwareLicensingProduct | Where{$_.PartialProductKey -and $_.Name -like "*Office*"} | Select -First 1; if($o.LicenseStatus -eq 1){$res.Office="ACTIVADO"}else{$res.Office="INSTALADO (Estado: $($o.LicenseStatus))"} 
            } catch { $res.OS += " (Err Lic: $_)" } 
            # EXTRA 
            $res.Screen="Generico"; try{$v=Get-CimInstance Win32_VideoController | Select -First 1; if($v){$res.Screen="$($v.CurrentHorizontalResolution) x $($v.CurrentVerticalResolution)"}}catch{} 
            $pnp = Get-CimInstance Win32_PnpEntity 
            $res.Touch="NO"; if($pnp | Where-Object {$_.Name -like "*Touch screen*"}){$res.Touch="SI (Pantalla Tactil)"} 
            $res.Finger="NO"; if($pnp | Where-Object {$_.Name -match 'Fingerprint'}){$res.Finger="SI (Biometria)"} 
            # UPGRADE 
            try { 
                $memArr = Get-CimInstance Win32_PhysicalMemoryArray; $memUsed = (Get-CimInstance Win32_PhysicalMemory).Count; $memSlots = $memArr.MemoryDevices; $memMax = [math]::Round($memArr.MaxCapacity / 1024 / 1024); $memFree = $memSlots - $memUsed 
                $res.ExpRam = "$memUsed instalados / $memSlots totales (Max $memMax GB)" 
            } catch { $res.ExpRam = "?" } 
            try { $res.ExpDisk = "Desconocido (Verificar visualmente)"; $s=Get-CimInstance Win32_SystemSlot|Where{$_.SlotDesignation -match 'M.2' -or $_.SlotDesignation -match 'SSD'}; if($s){$f=($s|Where{$_.CurrentUsage -eq 3}).Count; $res.ExpDisk="Slots M.2: $($s.Count) Total ^| $f Disponibles"} } catch {} 
            # BATTERY 
            $m1="--"; $m3="--" 
            if(Test-Path $battXml){try{[xml]$x=Get-Content $battXml; $b=@($x.BatteryReport.Batteries.Battery)[-1]; $f=$b.FullChargeCapacity; $d=$b.DesignCapacity; if($d-gt 0){$p=[math]::Round(($f/$d)*100); $m1="$p% (Ciclos: $($b.CycleCount))"}else{$m1="Leido"}}catch{}} 
            try{$w=Get-CimInstance Win32_Battery; if($w){$m3="$($w.EstimatedChargeRemaining)%"}}catch{} 
            $res.BattM1=$m1; $res.BattM3=$m3 
 
            $res.Status = "Done" 
        } catch { $res.Status = "Error: $_" } 
    } 
 
    # --- START BG THREAD --- 
    $runspace = [powershell]::Create() 
    $runspace.AddScript($scriptBlock) | Out-Null 
    $runspace.AddArgument($syncHash) | Out-Null 
    $runspace.AddArgument($BATTXML) | Out-Null 
    $handle = $runspace.BeginInvoke() 
 
    # --- GUI HELPERS --- 
    function New-RoundedButton([string]$t, [int]$x, [int]$y, [int]$w, [int]$h, [System.Drawing.Color]$bc, [System.Drawing.Color]$fc) { 
        $b = New-Object System.Windows.Forms.Button 
        $b.Text = $t; $b.Left=$x; $b.Top=$y; $b.Width=$w; $b.Height=$h 
        $b.BackColor=$bc; $b.ForeColor=$fc; $b.FlatStyle='Flat'; $b.FlatAppearance.BorderSize=0 
        $b.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold) 
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath 
        $rad = 20 
        $path.AddArc(0, 0, $rad, $rad, 180, 90) 
        $path.AddArc($w-$rad, 0, $rad, $rad, 270, 90) 
        $path.AddArc($w-$rad, $h-$rad, $rad, $rad, 0, 90) 
        $path.AddArc(0, $h-$rad, $rad, $rad, 90, 90) 
        $path.CloseFigure() 
        $b.Region = New-Object System.Drawing.Region($path) 
        return $b 
    } 
 
    # --- BUILD FORM --- 
    $bg   = [System.Drawing.Color]::FromArgb(17,24,39) 
    $card = [System.Drawing.Color]::FromArgb(31,41,55) 
    $text = [System.Drawing.Color]::FromArgb(243,244,246) 
    $acc  = [System.Drawing.Color]::FromArgb(37,99,235) 
    $warn = [System.Drawing.Color]::FromArgb(239,68,68) 
    $suc  = [System.Drawing.Color]::FromArgb(34,197,94) 
    $neu  = [System.Drawing.Color]::FromArgb(156,163,175) 
    try { Add-Type -AssemblyName System.Speech } catch {} 
    $synth = New-Object -TypeName System.Speech.Synthesis.SpeechSynthesizer 
 
    $form = New-Object System.Windows.Forms.Form 
    $form.Text = "QA Criterio Digital"; $form.Size = New-Object System.Drawing.Size(420,620) 
    $form.StartPosition = "CenterScreen"; $form.BackColor = $bg; $form.ForeColor = $text; $form.FormBorderStyle = "FixedDialog"; $form.MaximizeBox = $false 
    $pnlTop = New-Object System.Windows.Forms.Panel; $pnlTop.Height = 80; $pnlTop.Dock = "Top"; $pnlTop.BackColor = $bg; $form.Controls.Add($pnlTop) 
    try { $b64 = Get-Content $logoFile -Raw; $ms = New-Object System.IO.MemoryStream([Convert]::FromBase64String($b64)); $logoImg = [System.Drawing.Image]::FromStream($ms); $pbLogo = New-Object System.Windows.Forms.PictureBox; $pbLogo.Image=$logoImg; $pbLogo.SizeMode="Zoom"; $pbLogo.Height=70; $pbLogo.Width=200; $pbLogo.Left=110; $pbLogo.Top=10; $pnlTop.Controls.Add($pbLogo) } catch { $lblLogo = New-Object System.Windows.Forms.Label; $lblLogo.Text = "CRITERIO"; $lblLogo.Location = New-Object System.Drawing.Point(130, 20); $pnlTop.Controls.Add($lblLogo) } 
    $pnlCard = New-Object System.Windows.Forms.Panel; $pnlCard.Size = New-Object System.Drawing.Size(380, 460); $pnlCard.Location = New-Object System.Drawing.Point(12, 90); $pnlCard.BackColor = $card; $form.Controls.Add($pnlCard) 
    $lblMain = New-Object System.Windows.Forms.Label; $lblMain.Text = "PRUEBA 1/3: CAMARA"; $lblMain.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold); $lblMain.ForeColor = $acc; $lblMain.Size = New-Object System.Drawing.Size(360, 30); $lblMain.TextAlign = "MiddleCenter"; $lblMain.Location = New-Object System.Drawing.Point(10, 20); $pnlCard.Controls.Add($lblMain) 
    $lblSub = New-Object System.Windows.Forms.Label; $lblSub.Text = "Iniciando..."; $lblSub.Size = New-Object System.Drawing.Size(340, 60); $lblSub.TextAlign = "MiddleCenter"; $lblSub.Location = New-Object System.Drawing.Point(20, 60); $lblSub.ForeColor = $text; $pnlCard.Controls.Add($lblSub) 
    $btn = New-RoundedButton "INICIAR" 40 150 300 50 $acc "White"; $pnlCard.Controls.Add($btn) 
    $btnF = New-RoundedButton "FALLA" 40 220 300 40 $warn "White"; $btnF.Visible = $false; $pnlCard.Controls.Add($btnF) 
    $btnS = New-RoundedButton "OMITIR" 100 380 180 30 $card $neu; $btnS.FlatStyle="Flat"; $btnS.FlatAppearance.BorderColor=$neu; $pnlCard.Controls.Add($btnS) 
    $pb = New-Object System.Windows.Forms.ProgressBar; $pb.Size = New-Object System.Drawing.Size(340, 10); $pb.Location = New-Object System.Drawing.Point(20, 430); $pb.Style = "Continuous"; $pb.Value=0; $pnlCard.Controls.Add($pb) 
    $step=0; $rCam="?"; $rAud="?"; $rLit="?" 
    $timer = New-Object System.Windows.Forms.Timer; $timer.Interval = 500; $timer.Add_Tick({ 
        if($syncHash.Status -eq "Done") { $form.Text = "QA Criterio (Listo para generar)" } else { $form.Text = "QA Criterio (Analizando...)" } 
    }); $timer.Start() 
    function Next-Step { 
        $pb.Value = [math]::Min(100, $script:step * 33) 
        if ($script:step -eq 1) { $lblMain.Text="PRUEBA 2/3: AUDIO"; $lblSub.Text="Escuchando..."; $btn.Text="REPRODUCIR"; $btn.Visible=$true; $btnF.Visible=$false } 
        elseif ($script:step -eq 2) { $lblMain.Text="PRUEBA 3/3: HARDWARE"; $lblSub.Text="¿Luz de Teclado?"; $btn.Text="SI, TIENE"; $btnF.Text="NO TIENE"; $btnF.Visible=$true } 
        elseif ($script:step -eq 3) { 
            $lblMain.Text="GUARDANDO REPORTE..."; $btn.Visible=$false; $btnF.Visible=$false; $btnS.Visible=$false 
            while($syncHash.Status -ne "Done"){ [System.Windows.Forms.Application]::DoEvents(); Start-Sleep -m 100 } 
            $res = $syncHash 
            $safe = $res.Model -replace '[^a-zA-Z0-9]', '_' -replace '_+', '_' 
            $fName = "$($safe)_$(Get-Date -Format 'ddMM-HHmm')_$($res.Serial).txt" 
            $p = Join-Path $scriptPath $fName 
            $line="================================================================================" 
            $o=@(); $o+=$line; $o+="   CRITERIO DIGITAL  ^|  INFORME TECNICO  ^|  QA CERTIFICADO"; $o+=$line; $o+="FECHA   : " + (Get-Date).ToString("yyyy-MM-dd HH:mm"); $o+="" 
            $o+="[1] IDENTIFICACION"; $o+="    Marca       :   $($res.Brand)"; $o+="    Modelo      :   $($res.Model)"; $o+="    Serial      :   $($res.Serial)"; $o+="    UUID        :   $($res.UUID)"; $o+="    Sistema     :   $($res.OS) ($($res.WinStat))"; $o+="    Office      :   $($res.Office)"; $o+="" 
            $o+="[2] POTENCIA"; $o+="    CPU         :   $($res.CPU)"; $o+="    RAM Total   :   $($res.RamGB) GB ($($res.RamDet))"; $o+="    GPU         :   $($res.GPU)"; $o+="    Discos      :"; $res.Disks | ForEach { $o+="        $_" }; $o+="" 
            $o+="[3] CONECTIVIDAD"; $o+="    Pantalla    :   $($res.Screen)"; $o+="    Biometria   :   $($res.Finger)"; $o+="" 
            # $o+="[4] UPGRADE"; $o+="    RAM Slots   :   $($res.ExpRam)"; $o+="    Disk M.2    :   $($res.ExpDisk)"; $o+="" 
            $o+="[4] BATERIA"; $o+="    Salud XML   :   $($res.BattM1)"; $o+="    Carga Real  :   $($res.BattM3)"; $o+="" 
            $o+="[5] QA CHECKLIST"; $o+="    Camara      :   $rCam"; $o+="    Microfono   :   $rAud"; $o+="    Teclado Luz :   $rLit"; $o+=$line 
            $o | Out-File -FilePath $p -Encoding UTF8 
            [System.Windows.Forms.MessageBox]::Show("Reporte Guardado!`n$fName") 
            $form.Close() 
        } 
    } 
    $btn.Add_Click({ 
        if($step -eq 0){ $lblSub.Text="Abre la app Camara..."; Start-Process "microsoft.windows.camera:"; $script:step=0.5; $btn.Text="CAMARA OK"; $btnF.Text="HAY FALLA"; $btnF.Visible=$true } 
        elseif($step -eq 0.5){ Stop-Process -Name "WindowsCamera" -ErrorAction SilentlyContinue; $script:rCam="OK"; $script:step=1; Next-Step } 
        elseif($step -eq 1){ if($synth){$synth.Speak("Audio Check")}; [console]::Beep(500,200); $lblSub.Text="¿Sono algo?"; $btn.Text="SI, SONO"; $btnF.Text="NO SONO"; $btnF.Visible=$true; $script:step=1.5 } 
        elseif($step -eq 1.5){ $script:rAud="OK"; $script:step=2; Next-Step } 
        elseif($step -eq 2){ $script:rLit="SI"; $script:step=3; Next-Step } 
    }) 
    $btnF.Add_Click({ 
        if($step -eq 0.5){ Stop-Process -Name "WindowsCamera" -ErrorAction SilentlyContinue; $script:rCam="FAIL"; $script:step=1; Next-Step } 
        elseif($step -eq 1.5){ $script:rAud="FAIL"; $script:step=2; Next-Step } 
        elseif($step -eq 2){ $script:rLit="NO"; $script:step=3; Next-Step } 
    }) 
    $btnS.Add_Click({ 
        if($step -le 0.5){ Stop-Process -Name "WindowsCamera" -ErrorAction SilentlyContinue; $script:rCam="-"; $script:step=1; Next-Step } 
        elseif($step -le 1.5){ $script:rAud="-"; $script:step=2; Next-Step } 
        elseif($step -eq 2){ $script:rLit="-"; $script:step=3; Next-Step } 
    }) 
    $form.ShowDialog() | Out-Null 
    $runspace.Dispose() 
} catch { $_ | Out-File "C:\Users\diego\.gemini\antigravity\scratch\frontend\scripts\error_log.txt" } 
