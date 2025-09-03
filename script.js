// NEIS OpenAPI 키를 직접 코드에 하드코딩
const API_KEY = 'b73f7206adf743c7b18aec1ab514d19b';

// 고정: 부산광역시 대양고등학교
const SCHOOL_INFO = {
  officeCode: 'C10',      // 부산광역시교육청
  schoolCode: '7530567',  // 대양고등학교
  schoolName: '대양고등학교'
};

// 급식 정보 조회 (지정된 날짜: yyyy-MM-dd)
async function fetchMeal(date) {
  if (!date) throw new Error('날짜가 필요합니다.');
  const ymd = date.replace(/-/g, '');
  const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${API_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${SCHOOL_INFO.officeCode}&SD_SCHUL_CODE=${SCHOOL_INFO.schoolCode}&MLSV_YMD=${ymd}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP 오류: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data;
}

// 급식 데이터 파싱
function parseMealData(data) {
  if (!data.mealServiceDietInfo) {
    return '급식 정보를 찾을 수 없습니다. (API 응답 구조 오류)';
  }
  const header = data.mealServiceDietInfo[0];
  if (!header || !header.head || !header.head[1] || !header.head[1].RESULT) {
    return 'API 응답 형식이 올바르지 않습니다.';
  }
  const result = header.head[1].RESULT;
  if (result.CODE !== 'INFO-000') {
    return `API 오류: ${result.CODE} - ${result.MSG || '알 수 없는 오류'}`;
  }
  if (!data.mealServiceDietInfo[1] || !data.mealServiceDietInfo[1].row) {
    return '해당 날짜에는 급식 정보가 없습니다. (방학 또는 공휴일일 수 있습니다)';
  }
  const mealRows = data.mealServiceDietInfo[1].row;
  if (!Array.isArray(mealRows) || mealRows.length === 0) {
    return '해당 날짜에는 급식 정보가 없습니다. (방학 또는 공휴일일 수 있습니다)';
  }
  return mealRows.map(row => {
    const mealName = row.MMEAL_SC_NM || '급식';
    const menu = (row.DDISH_NM || '메뉴 정보 없음')
      .replace(/<br\/>/g, '<br>')
      .replace(/\./g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return `<b>${mealName}</b><br>${menu}`;
  }).join('<hr>');
}

// 날짜 포맷팅 (yyyy년 mm월 dd일)
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}년 ${m}월 ${d}일`;
}

// DOM 요소
const form = document.getElementById('meal-form');
const resultDiv = document.getElementById('result');
const dateInput = document.getElementById('date');

// 기본값: 오늘 날짜
(function setDefaultToday() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  dateInput.value = `${yyyy}-${mm}-${dd}`;
})();

// 폼 제출 시 급식 조회
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  resultDiv.innerHTML = '조회 중...';
  const date = dateInput.value;
  if (!date) {
    resultDiv.innerHTML = '날짜를 선택해주세요.';
    return;
  }
  try {
    const data = await fetchMeal(date);
    const mealContent = parseMealData(data);
    resultDiv.innerHTML = `<div style='font-size:15px;margin-bottom:8px;'><b>${SCHOOL_INFO.schoolName}</b> - ${formatDate(date)}</div>${mealContent}`;
  } catch (err) {
    resultDiv.innerHTML = err.message || 'API 요청 중 오류가 발생했습니다.';
  }
});

// 페이지 로드 시 자동 조회 (오늘)
window.addEventListener('load', async () => {
  resultDiv.innerHTML = '오늘의 급식을 불러오는 중...';
  try {
    const date = dateInput.value;
    const data = await fetchMeal(date);
    const mealContent = parseMealData(data);
    resultDiv.innerHTML = `<div style='font-size:15px;margin-bottom:8px;'><b>${SCHOOL_INFO.schoolName}</b> - ${formatDate(date)}</div>${mealContent}`;
  } catch (err) {
    resultDiv.innerHTML = err.message || 'API 요청 중 오류가 발생했습니다.';
  }
});

