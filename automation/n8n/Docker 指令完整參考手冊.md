# Docker 指令完整參考手冊

> 涵蓋環境、映像、容器、Compose、資料卷、網路、清理、除錯等所有常用指令與其選項；工作流程範例對齊 n8n 部署實戰

---

## 目錄

1. [環境確認與資訊](#1-環境確認與資訊)
2. [映像管理(Image)](#2-映像管理image)
3. [容器生命週期](#3-容器生命週期)
4. [容器互動與觀察](#4-容器互動與觀察)
5. [Docker Compose](#5-docker-compose)
6. [資料卷與掛載(Volume)](#6-資料卷與掛載volume)
7. [網路(Network)](#7-網路network)
8. [清理與空間管理](#8-清理與空間管理)
9. [登錄與分享(Registry)](#9-登錄與分享registry)
10. [除錯與進階工具](#10-除錯與進階工具)
11. [常用設定技巧](#11-常用設定技巧)
12. [常見工作流程範例](#12-常見工作流程範例)

---

## 1. 環境確認與資訊

### `docker version` / `docker info`
確認 Docker 是否安裝、引擎(daemon)是否在跑。

```bash
docker version        # 分別顯示 Client(遙控器) 與 Server(引擎) 版本
docker info           # 系統層級資訊：容器數、映像數、儲存驅動、資源
docker --version      # 只印一行 CLI 版本
```

> **最重要的排錯觀念**：`docker` 指令(Client)只是遙控器，真正幹活的是背景的 **Server/daemon**。
> 若 `docker version` 的 **Server 那格是空的**、或出現 `Cannot connect to the Docker daemon` / `pipe/dockerDesktopLinuxEngine ... cannot find`──
> **代表引擎沒啟動，不是 Docker 壞了**。第一反應是「**打開 Docker Desktop 等它就緒**」，不是重裝。

### `docker context`
管理連線目標(本機引擎 / 遠端 / 不同後端)。

```bash
docker context ls                # 列出所有 context，星號為目前使用中
docker context use <名稱>         # 切換 context
```

### 取得說明

```bash
docker <指令> --help    # 任何指令都能加，例如 docker run --help
docker help             # 總覽
```

---

## 2. 映像管理(Image)

映像(image)＝唯讀的「範本」；容器(container)＝映像跑起來的「實例」。

### `docker pull`
從 registry 下載映像。

```bash
docker pull <映像>                       # 預設抓 :latest
docker pull <映像>:<標籤>                 # 抓指定版本(建議永遠指定，別用 latest)
docker pull <映像>@sha256:<digest>        # 用 digest 抓(永不變，最強的版本釘死)
docker pull --platform linux/arm64 <映像> # 指定架構(在 Mac/多架構情境用)
```

### `docker images` / `docker image ls`
列出本機映像。

```bash
docker images                    # 列出所有映像
docker images -a                 # 含中間層
docker images --digests          # 顯示每個映像的 digest
docker images --filter "dangling=true"   # 只列無標籤的孤兒映像
docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}"  # 自訂欄位
```

### `docker build`
用 Dockerfile 建置映像。

```bash
docker build -t <名稱>:<標籤> .          # 用當前目錄的 Dockerfile 建置
docker build -f <路徑/Dockerfile> .      # 指定非預設的 Dockerfile
docker build --no-cache -t <名稱> .      # 不用快取，完整重建
docker build --build-arg KEY=值 -t <名稱> .   # 傳入建置參數
docker build --target <階段> -t <名稱> .      # 只建到多階段(multi-stage)的某階段
```

### `docker tag`
給映像加上另一個標籤(常用於推送前改名)。

```bash
docker tag <來源映像> <新名稱>:<新標籤>
docker tag myapp:latest myrepo/myapp:1.0.0
```

### `docker rmi`
刪除映像。

```bash
docker rmi <映像>                # 刪除映像
docker rmi -f <映像>             # 強制刪除(即使有容器用它)
```

### `docker image inspect` / `docker history`
查看映像細節。

```bash
docker image inspect <映像>                              # 完整 JSON 資訊
docker image inspect --format '{{index .RepoDigests 0}}' <映像>  # 只取 digest(拿來 pin 用)
docker history <映像>                                    # 逐層看映像怎麼堆出來的
```

### `docker save` / `docker load`
把映像打包成檔案、在無網路環境搬移(**離線安裝包很好用**)。

```bash
docker save -o n8n.tar n8nio/n8n:2.29.11     # 匯出成 tar
docker load -i n8n.tar                        # 從 tar 匯入
```

### `docker buildx imagetools inspect`
不下載就查 registry 上的映像資訊(digest、支援哪些架構)。

```bash
docker buildx imagetools inspect <映像>:<標籤>                        # 看 digest 與所有平台
docker buildx imagetools inspect <映像>:<標籤> --format '{{.Manifest.Digest}}'  # 只取跨架構 digest
```

### `docker image prune`
清除無用映像。

```bash
docker image prune           # 刪除無標籤的孤兒映像
docker image prune -a        # 刪除所有「沒有容器在用」的映像(危險，會清很多)
```

---

## 3. 容器生命週期

### `docker run`
從映像建立並啟動一個新容器(＝create + start)。

```bash
docker run <映像>                          # 前景執行
docker run -d <映像>                       # 背景執行(detached)
docker run -d --name <容器名> <映像>        # 指定名稱
docker run -d -p 8080:80 <映像>            # 埠映射：宿主 8080 → 容器 80
docker run -d -p 127.0.0.1:8080:80 <映像>  # 只綁本機(別台機器連不進來)
docker run -d -v mydata:/data <映像>       # 掛載具名卷(資料持久化)
docker run --rm -it <映像> sh              # 一次性容器、進 shell、結束即刪
```

常用選項:
| 選項 | 說明 |
|---|---|
| `-d, --detach` | 背景執行 |
| `--name <名>` | 指定容器名稱(否則隨機一個) |
| `-p 宿主:容器` | 埠映射；加 `127.0.0.1:` 前綴＝只綁本機 |
| `-v 卷名:/路徑` | 掛載**具名卷**(資料活過容器) |
| `-v /宿主路徑:/容器路徑` | **綁定掛載**(bind mount，直接對應主機資料夾) |
| `-e KEY=值` | 設定環境變數 |
| `--env-file <檔>` | 從檔案批次載入環境變數 |
| `--rm` | 容器結束後自動刪除 |
| `-it` | 互動 + 分配終端(跑 shell 用) |
| `--restart <策略>` | `no`／`on-failure`／`always`／`unless-stopped` |
| `--network <網路>` | 指定加入的網路 |
| `-w <路徑>` | 設定容器內工作目錄 |
| `--memory <限制>` | 記憶體上限，如 `512m` |
| `--cpus <數>` | CPU 上限，如 `1.5` |

### `docker ps`
列出容器。

```bash
docker ps                    # 只列「執行中」的容器
docker ps -a                 # 列出所有容器(含已停止)
docker ps -q                 # 只印容器 ID(常用於腳本批次操作)
docker ps --filter "name=n8n"                       # 依條件篩選
docker ps --format "table {{.Names}}\t{{.Status}}"  # 自訂欄位
```

### 啟停與刪除

```bash
docker start <容器>          # 啟動已停止的容器
docker stop <容器>           # 優雅停止(送 SIGTERM，逾時再 SIGKILL)
docker restart <容器>        # 重啟
docker pause <容器>          # 暫停(凍結所有程序)
docker unpause <容器>        # 解除暫停
docker kill <容器>           # 強制停止(直接 SIGKILL)
docker rm <容器>             # 刪除已停止的容器
docker rm -f <容器>          # 強制刪除(含執行中，危險)
docker rm -v <容器>          # 刪除容器並一併移除其匿名卷
docker rename <舊名> <新名>   # 重新命名容器
```

---

## 4. 容器互動與觀察

### `docker exec`
在**執行中**的容器裡執行指令(除錯神器)。

```bash
docker exec -it <容器> sh              # 進容器的 shell(輕量映像多為 sh，非 bash)
docker exec -it <容器> bash            # 若映像有 bash
docker exec <容器> <指令>              # 直接跑一條指令，例如查版本
docker exec -u root -it <容器> sh      # 以 root 身分進入
```

> 注意：極簡映像(如 Mailpit、scratch base)可能**沒有任何 shell**，`exec ... sh` 會失敗——這正常，改用 `logs`／`inspect` 觀察。

### `docker logs`
看容器的標準輸出/錯誤(卡住、報錯先看這)。

```bash
docker logs <容器>              # 印出全部日誌
docker logs -f <容器>           # 持續跟隨(like tail -f)，Ctrl+C 離開
docker logs --tail 100 <容器>   # 只看最後 100 行
docker logs --since 10m <容器>  # 只看最近 10 分鐘
docker logs -t <容器>           # 每行加時間戳
```

### `docker inspect` / `docker stats` / `docker top`

```bash
docker inspect <容器或映像>                            # 完整 JSON(設定、掛載、網路、IP…)
docker inspect --format '{{.State.Status}}' <容器>     # 只取某欄位(Go template)
docker stats                                          # 即時看所有容器 CPU/記憶體(like top)
docker stats --no-stream                              # 只印一次快照
docker top <容器>                                      # 看容器內跑哪些程序
```

### `docker cp`
在主機與容器之間複製檔案。

```bash
docker cp <容器>:/容器內路徑 ./本機路徑     # 從容器複製出來
docker cp ./本機檔案 <容器>:/容器內路徑     # 複製進容器
```

### `docker port` / `docker diff`

```bash
docker port <容器>       # 顯示該容器的埠映射
docker diff <容器>       # 顯示容器檔案系統相對映像的變動(A新增/C修改/D刪除)
```

---

## 5. Docker Compose

用一份 YAML 描述「一組要一起跑的容器」，一鍵起停。

> **型態注意**：現代是 `docker compose`(**空格**，plugin，v2 以上)；舊的 `docker-compose`(**連字號**，v1，2021 前)語法與行為不同。
> 一句驗證：`docker compose version` 印得出版本就是新版。現代 compose 檔**不需要**開頭的 `version:` 欄位了。

### `docker compose up`
建立並啟動 compose 定義的所有服務。

```bash
docker compose up                    # 前景執行(看得到即時 log，Ctrl+C 停)
docker compose up -d                 # 背景執行(detached，最常用)
docker compose up -d --build         # 啟動前先重新 build 映像
docker compose up -d --force-recreate  # 強制重建容器(即使設定沒變)
docker compose up -d --pull always   # 每次都拉最新映像
docker compose -f <檔案> up -d       # 指定非預設檔名的 compose 檔
```

### `docker compose down`
停止並移除 compose 建立的容器與網路。

```bash
docker compose down          # 砍容器與網路；具名卷保留(資料還在)
docker compose down -v       # 連具名卷一起砍(危險，資料全毀＝災難演練)
docker compose down --rmi all  # 順便刪除用到的映像
```

### 觀察與操作單一服務

```bash
docker compose ps               # 列出本 compose 專案的容器狀態
docker compose ps -a            # 含已停止
docker compose logs -f          # 跟隨所有服務日誌
docker compose logs -f <服務名>  # 只看某服務(注意：用「服務名」如 n8n，非容器名)
docker compose exec <服務名> sh  # 進某服務的 shell
docker compose restart <服務名>  # 重啟單一服務
docker compose stop / start      # 停止/啟動(不刪容器)
```

### 建置、拉取、驗證

```bash
docker compose build            # 只建置(不啟動)
docker compose pull             # 只拉取映像(不啟動)
docker compose config           # 驗證並展開最終 YAML(除錯設定用)
docker compose config --services  # 列出所有服務名
```

常用選項:
| 選項 | 說明 |
|---|---|
| `-f <檔案>` | 指定 compose 檔(可多次疊加) |
| `-d` | 背景執行 |
| `--project-directory <路徑>` | 指定專案根目錄(影響相對路徑與專案名) |
| `-p <專案名>` | 指定專案名稱(預設＝資料夾名) |

> **服務名 vs 容器名**：compose 內用「**服務名**」互相操作(如 `logs n8n`)；但實際容器名是 `<專案>-<服務>-<序號>`(如 `n8n-practice-n8n-1`)。所以 `docker exec n8n ...` 會失敗，要用 `docker compose exec n8n ...` 或完整容器名。
>
> **`name:` 頂層鍵**：compose 檔第一行可宣告 `name: <專案名>`(本專案的 docker-compose.yml 即 `name: n8n`)，優先權高於「預設＝資料夾名」與 `-p`——所以檔案搬到哪個資料夾，都認同一組容器與資料卷。

---

## 6. 資料卷與掛載(Volume)

### 三種資料掛法

```bash
-v <卷名>:/容器路徑          # 具名卷：Docker 管理，容器砍了資料還在(最推薦持久化)
-v /宿主路徑:/容器路徑        # 綁定掛載(bind)：直接對應主機資料夾(改 code、掛設定用)
--mount type=volume,src=<卷名>,dst=/容器路徑   # 新語法，等價但更明確
```

### `docker volume`

```bash
docker volume ls                 # 列出所有卷
docker volume create <卷名>       # 手動建立卷
docker volume inspect <卷名>      # 查看卷細節(含實體存放路徑)
docker volume rm <卷名>           # 刪除卷
docker volume prune              # 刪除所有「沒被容器用」的卷(危險)
```

> **核心不變式**：**容器可拋、資料卷不可拋**。`docker compose down` 砍容器→資料還在卷裡活著；只有 `down -v` 或 `volume rm` 才會真正毀掉資料。帳號、設定、資料庫都在卷裡，不在容器。

---

## 7. 網路(Network)

### `docker network`

```bash
docker network ls                        # 列出所有網路
docker network create <網路名>            # 建立自訂網路
docker network inspect <網路名>           # 查看網路細節(誰連在上面、IP)
docker network connect <網路> <容器>      # 把容器接上網路
docker network disconnect <網路> <容器>   # 斷開
docker network rm <網路名>                # 刪除網路
docker network prune                     # 刪除所有未使用的網路
```

> **核心不變式**：**同一個 Compose 內，服務名就是主機名**。compose 自動把所有服務放進同一個私有網路，彼此用「服務名」當 DNS 互打(如 n8n 連 `mailpit:1025`)，不需要 IP、也不是 `localhost`。

---

## 8. 清理與空間管理

```bash
docker system df                 # 看 Docker 佔了多少硬碟(映像/容器/卷/快取)
docker system df -v              # 逐項細看
docker system prune              # 清除停止的容器、無用網路、孤兒映像、build 快取
docker system prune -a           # 再加上「沒被任何容器用」的所有映像(危險)
docker system prune -a --volumes # 連未使用的卷也清(最徹底，最危險)
docker container prune           # 只清已停止的容器
docker image prune -a            # 只清無用映像
docker volume prune              # 只清無用卷
docker builder prune             # 只清 build 快取
```

> 硬碟爆掉時的標準流程：先 `docker system df` 看誰佔空間，再選對應的 `prune`，別無腦 `-a --volumes`(會把你想留的資料卷也清掉)。

---

## 9. 登錄與分享(Registry)

```bash
docker login                          # 登入 Docker Hub(會問帳密)
docker login <registry網址>            # 登入私有 registry
docker logout                         # 登出
docker tag <本機映像> <帳號>/<倉庫>:<標籤>  # 推送前先打上 registry 命名
docker push <帳號>/<倉庫>:<標籤>        # 推送映像到 registry
docker pull <帳號>/<倉庫>:<標籤>        # 拉取
docker search <關鍵字>                 # 在 Docker Hub 搜尋映像
```

> 憑證安全：`docker login` 後憑證存在本機的 credential store；別把帳密寫進 script 或 compose，也別把私有 registry token 進 git。

---

## 10. 除錯與進階工具

### `docker inspect --format`(Go template)
從一大包 JSON 精準取一個值，寫腳本必備。

```bash
docker inspect --format '{{.State.Health.Status}}' <容器>   # 健康檢查狀態
docker inspect --format '{{.NetworkSettings.IPAddress}}' <容器>  # 容器 IP
docker inspect --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}' <容器>  # 掛載對應
```

### `docker events`
即時監看 Docker 引擎發生的事件(容器起停、OOM 等)。

```bash
docker events                    # 即時串流
docker events --since 1h         # 回看最近一小時
```

### `docker commit` / `export` / `import`

```bash
docker commit <容器> <新映像名>       # 把容器現況存成映像(應急用，別當正式部署手段)
docker export <容器> -o fs.tar       # 匯出容器「檔案系統」為 tar
docker import fs.tar <映像名>         # 從 tar 匯入成映像
```

> `save/load`(第 2 節)搬的是**映像含歷史層**；`export/import` 搬的是**容器攤平後的檔案系統**(丟失分層與 metadata)。搬映像用 `save/load`。

### 健康檢查(Healthcheck)
compose 裡可為服務定義健康檢查，`docker ps` 的 STATUS 會顯示 `(healthy)`：

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5678/healthz"]
  interval: 30s
  timeout: 5s
  retries: 3
```

---

## 11. 常用設定技巧

### Shell 別名(Docker 沒有內建 alias，用 shell 設)

```bash
# 寫進 ~/.bashrc 或 PowerShell $PROFILE
alias dps='docker ps'
alias dcu='docker compose up -d'
alias dcd='docker compose down'
alias dcl='docker compose logs -f'
```

### `.dockerignore`
在 build context 根目錄建立，列出 build 時要忽略的檔案(加快建置、避免把祕密打進映像):

```
node_modules/
.git/
*.log
.env
```

### 重啟策略(讓服務開機自啟、崩潰自復)

```bash
docker run -d --restart unless-stopped <映像>
# compose 裡：restart: unless-stopped
```

### `--format` 自訂輸出

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
docker images --format "{{.Repository}}:{{.Tag}} = {{.Size}}"
```

---

## 12. 常見工作流程範例

**起一套 Compose 服務(日常):**

```bash
cd <compose 資料夾>
docker compose up -d          # 背景起全部服務
docker compose ps             # 確認都 Up
docker compose logs -f n8n    # 卡住就看 log
```

**進容器查實際版本(驗證 pin 對不對):**

```bash
docker compose exec n8n n8n --version
# 或用完整容器名：docker exec <專案>-n8n-1 n8n --version
```

**災難演練(驗證能從零還原):**

```bash
docker compose down -v        # 全毀(含資料卷)
docker compose up -d          # 從 compose + 版控重建
# → 匯入 workflow JSON、重建憑證、逐條啟用
```

**查映像 digest 與支援架構(版本釘死 / 跨 Mac 驗證):**

```bash
docker buildx imagetools inspect n8nio/n8n:2.29.11 --format '{{.Manifest.Digest}}'
docker buildx imagetools inspect n8nio/n8n:2.29.11 | grep -i platform
```

**引擎連不到的排錯(親身踩過):**

```bash
docker version                # 看 Server 那格是不是空的
# 空的 / 報 pipe...cannot find → 打開 Docker Desktop，等 30–60 秒引擎就緒
docker version                # 再確認 Server 有版本號才繼續
```

**硬碟空間不足:**

```bash
docker system df              # 先看誰佔空間
docker image prune -a         # 清無用映像(先從最保守的清)
docker system prune           # 清容器/網路/快取(不動具名卷)
```

**離線搬移映像到沒網路的機器(一鍵安裝包思路):**

```bash
# 有網路的機器：
docker save -o bundle.tar n8nio/n8n:2.29.11 axllent/mailpit:v1.30.4
# 目標機器(把 bundle.tar 拷過去後)：
docker load -i bundle.tar
docker compose up -d          # 映像已在本機，不用連網拉
```

---

> 提示:大多數指令都可加 `--help` 看完整說明，例如 `docker run --help`、`docker compose up --help`。
> 危險指令(標「危險」者)動手前先想清楚：`down -v`、`system prune -a --volumes`、`rm -f`、`volume rm` 會**真的刪資料**。
