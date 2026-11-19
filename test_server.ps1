$proc = Start-Process -FilePath "C:\Program Files\Java\jdk-26.0.2\bin\java.exe" -ArgumentList "HireFlowServer" -PassThru
Start-Sleep -Seconds 2
try {
    $res1 = Invoke-RestMethod -Uri "http://localhost:8080/api/state"
    Write-Output "State OK: users=$($res1.users.Count), jobs=$($res1.jobs.Count), applications=$($res1.applications.Count)"

    $loginBody = '{"email":"seeker@hireflow.io","password":"seeker123"}'
    $res2 = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    Write-Output "Login OK: $($res2.user.name) ($($res2.user.role))"

    $loginRec = '{"email":"recruiter@technova.io","password":"recruiter123"}'
    $resRec = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method POST -Body $loginRec -ContentType "application/json"
    Write-Output "Recruiter Login OK: $($resRec.user.name) ($($resRec.user.company))"

    $loginAdmin = '{"email":"admin@hireflow.io","password":"admin123"}'
    $resAdmin = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method POST -Body $loginAdmin -ContentType "application/json"
    Write-Output "Admin Login OK: $($resAdmin.user.name) ($($resAdmin.user.role))"

    $page = Invoke-WebRequest -Uri "http://localhost:8080/" -UseBasicParsing
    Write-Output "Static File OK: $($page.StatusCode), Content length: $($page.Content.Length)"
} finally {
    Stop-Process -Id $proc.Id -Force
}

