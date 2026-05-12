$word = New-Object -ComObject Word.Application
$word.Visible = $false

$files = Get-ChildItem -Filter "*.doc*" | Where-Object { $_.Name -match "\d+.*2026" }
$allStudents = @()

foreach ($file in $files) {
    $doc = $word.Documents.Open($file.FullName)
    $text = $doc.Content.Text
    $doc.Close()
    
    $course = $file.BaseName
    $lines = $text -split "`r"
    
    foreach ($line in $lines) {
        $line = $line.Trim()
        # Look for RUT pattern: XXXXXXXX-X
        if ($line -match "(\d{7,8}-[\dkK])") {
            $rut = $matches[1]
            # Try to get the name. Usually the line contains RUT and Name.
            # We'll split or replace the RUT to get the name.
            $name = $line -replace $rut, ""
            $name = $name.Trim()
            
            if ($name -and $rut) {
                $student = [PSCustomObject]@{
                    curso = $course
                    rut = $rut
                    nombreCompleto = $name
                }
                $allStudents += $student
            }
        }
    }
}

$word.Quit()
$allStudents | ConvertTo-Json | Out-File -FilePath "students_extracted.json" -Encoding utf8
Write-Output "Extracted $($allStudents.Count) students."
