# 2026 월드컵 예측 게임 (KickTipp Clone)

GitHub Pages에서 동작하는 2026 FIFA 월드컵(미국·캐나다·멕시코) 예측 게임입니다.
모든 데이터는 `data/` 폴더의 JSON 파일로 관리됩니다.

## 구조

```
index.html               메인 페이지 (홈 / 일정 / 조별 순위 / 내 예측 / 랭킹)
css/style.css            스타일
js/app.js                데이터 로딩 및 화면 렌더링 로직
data/teams.json          12개 조(A~L), 48개 참가국
data/matches.json        전체 104경기 일정 (조별리그 72 + 토너먼트 32)
data/tips.json           사용자 예측 데이터베이스 (자동 갱신)
.github/ISSUE_TEMPLATE/tip.yml   예측 제출용 GitHub 이슈 양식
.github/workflows/process-tip.yml  이슈를 파싱해 data/tips.json에 반영하는 자동화
```

## 예측 제출 흐름

1. 사용자가 **내 예측** 탭에서 닉네임과 경기별 예상 스코어를 입력합니다.
2. **브라우저에 저장**: 입력 내용을 `localStorage`에 임시 저장합니다 (다음 방문 시 복원).
3. **GitHub에 제출**: 입력한 예측이 담긴 GitHub 이슈 작성 화면이 새 탭에서 열립니다 (GitHub 로그인 필요).
4. 이슈를 제출(Submit new issue)하면 `process-tip.yml` 워크플로가 실행되어 내용을 검증한 뒤
   `data/tips.json`에 해당 사용자의 예측을 추가/갱신하고, 이슈에 확인 댓글을 남긴 뒤 자동으로 닫습니다.
5. **랭킹** 탭은 `data/tips.json`과 `data/matches.json`의 결과를 비교해 자동으로 점수를 계산합니다.

### 채점 방식

- 4점: 정확한 스코어 적중
- 3점: 골득실차 적중 (스코어는 다름)
- 2점: 승/무/패 결과만 적중
- 0점: 결과 불일치

## 경기 결과 입력 (관리자)

경기가 끝나면 `data/matches.json`에서 해당 경기의 `homeScore`, `awayScore`를
실제 점수로 수정하고 커밋하세요. **조별 순위**와 **랭킹**은 이 값을 기반으로 자동 계산됩니다.

토너먼트 대진(`ro32` 이후)은 조별리그 결과가 확정되면 `home`/`away`의 `id`와
`name_ko`를 실제 진출 팀으로 갱신해주세요. `id`가 채워진(미정이 아닌) 경기만
**내 예측** 탭에 표시됩니다.

## 사전 설정 (1회)

GitHub Action이 `data/tips.json`을 커밋할 수 있도록
**Settings → Actions → General → Workflow permissions**에서
**"Read and write permissions"**을 활성화해야 합니다.
