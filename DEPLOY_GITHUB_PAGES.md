# GitHub Pages 배포 안내

전체 웹 소스와 자동 배포 설정이 포함돼 있습니다. 서버나 API 키를 준비할 필요가 없습니다.

## 1. 저장소와 Pages 설정

1. GitHub에서 새 저장소를 만듭니다. 이름 예: `haneye-finance`.
2. 기본 브랜치는 `main`을 사용합니다. 생성 시 README를 추가하면 설정 메뉴를 바로 사용할 수 있습니다.
3. GitHub Free 계정이라면 공개 저장소를 사용하세요. 비공개 저장소의 Pages 사용 가능 여부는 요금제에 따라 다릅니다.
4. **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택합니다.

이 구성은 `Deploy from a branch` 방식이 아닙니다. 앱에 로그인 기능이 없으므로 일반 GitHub Pages로 배포하면 다른 사람도 웹페이지를 볼 수 있습니다. 개인 브라우저에 저장된 계산 조건은 업로드되지 않습니다.

## 2. 압축을 풀고 파일 업로드

1. ZIP을 풀어 `haneye-finance` 폴더를 엽니다.
2. 그 폴더 **안의 파일과 폴더**를 저장소 최상위에 업로드합니다. 바깥 `haneye-finance` 폴더가 한 겹 더 들어가지 않도록 합니다.
3. `Add file → Upload files`를 쓰거나, GitHub Desktop으로 파일을 복사해 커밋·푸시합니다.

| 저장소에서 보여야 하는 위치 | 용도 |
|---|---|
| `README.md` | 프로젝트 안내 |
| `package.json` | 테스트 명령 |
| `.github/workflows/pages.yml` | 자동 배포 설정 |
| `dist/index.html` | 웹페이지 |
| `tests/` | 자동 검증 |

**`.github` 폴더를 빠뜨리지 마세요.** 보이지 않으면 숨김 파일 표시를 켜거나 GitHub Desktop을 사용하세요. 워크플로만 누락됐다면 `Add file → Create new file`에서 `.github/workflows/pages.yml`을 만들고 제공된 파일의 내용을 붙여 넣어도 됩니다.

## 3. 배포 확인

1. `main`에 업로드하면 **Actions → Test and deploy GitHub Pages**가 실행됩니다.
2. `verify`에서 23개 테스트를 실행하고, 통과하면 `deploy`가 `dist/`만 배포합니다.
3. 자동 실행이 보이지 않으면 **Run workflow → main → Run workflow**를 누릅니다.
4. 성공 후 **Settings → Pages → Visit site** 또는 Actions의 배포 주소로 접속합니다.

일반적인 주소는 `https://사용자명.github.io/저장소명/`입니다. `사용자명.github.io`라는 저장소라면 주소의 저장소명 부분이 없습니다. 자산이 상대 경로이므로 코드의 `base` 설정은 필요하지 않습니다.

## 배포 후 확인할 항목

- 스타일과 네 계산기 표시, 숫자 변경 시 결과 갱신
- 저장·불러오기·삭제
- 결과 링크를 새 탭에서 열었을 때 조건 복원
- CSV 다운로드와 한글 표시
- 휴대폰 화면의 입력·결과·가로 표 스크롤

## 문제 해결

| 증상 | 확인 방법 |
|---|---|
| Pages 설정이 없음 | 저장소 관리 권한, 요금제, 공개 여부를 확인합니다. |
| `Get Pages site failed` | Settings → Pages의 Source를 GitHub Actions로 설정한 뒤 다시 실행합니다. |
| Actions에 워크플로가 없음 | `.github/workflows/pages.yml` 위치와 업로드 여부를 확인합니다. |
| `verify`가 파일을 못 찾음 | 바깥 폴더가 한 단계 중첩되지 않았는지 확인합니다. |
| 404 | Actions 성공 여부와 Settings에 표시된 정확한 주소를 확인합니다. 처음 게시한 직후에는 잠시 후 다시 확인합니다. |
| 스타일 없이 HTML만 표시 | `dist`의 파일을 모두 올렸는지, `./style.css`·`./app.js` 경로를 바꾸지 않았는지 확인합니다. |
| 더블클릭으로 열면 계산기가 비어 있음 | `file://` 실행은 지원하지 않습니다. README의 로컬 서버 또는 Pages를 사용합니다. |
| 다른 기기에서 저장 내역이 없음 | 브라우저·사이트 경로별 저장이며 동기화되지 않습니다. |
| 기본 브랜치가 `master` 등 다른 이름 | `pages.yml`의 트리거와 배포 조건의 `main`을 실제 브랜치명으로 바꿉니다. |

개인 액세스 토큰을 코드에 넣을 필요가 없습니다. 워크플로는 GitHub가 작업 중 제공하는 토큰과 Pages 권한을 사용합니다.

## 선택: Git 명령으로 올리기

아직 Git 저장소가 아닌 압축 해제 폴더에서, **비어 있는** 새 원격 저장소에 처음 올릴 때 사용하는 예입니다. URL은 본인 저장소로 바꾸세요.

```sh
git init -b main
git add .
git commit -m "Add financial calculators and Pages workflow"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

원격에 README 등 기존 커밋이 있다면 GitHub Desktop 또는 `git clone`으로 먼저 가져온 뒤 파일을 복사합니다. 기존 이력을 덮어쓰는 강제 푸시는 필요하지 않습니다.

## 공식 안내

- [Pages 사용자 지정 워크플로](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [게시 소스 설정](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [정적 사이트 워크플로 예시](https://github.com/actions/starter-workflows/blob/main/pages/static.yml)
- [Node.js 설정 액션](https://github.com/actions/setup-node)

확인일: 2026-10-10. 조직의 GitHub 권한·정책에 따라 메뉴와 사용 범위가 달라질 수 있습니다.
