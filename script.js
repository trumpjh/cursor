// NEIS OpenAPI 키를 직접 코드에 하드코딩
const API_KEY = 'b73f7206adf743c7b18aec1ab514d19b';

// 부산광역시 대양고등학교 정보 고정
const SCHOOL_INFO = {
  officeCode: 'C10',      // 부산광역시교육청
  schoolCode: '7530567',  // 대양고등학교
  schoolName: '대양고등학교'
};

// 급식 정보 조회 (당일)
async function fetchMeal() {
  const today = new Date();
  const ymd = today.getFullYear().toString() + 
              String(today.getMonth() + 1).padStart(2, '0') + 
              String(today.getDate()).padStart(2, '0');
  
  const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${API_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${SCHOOL_INFO.officeCode}&SD_SCHUL_CODE=${SCHOOL_INFO.schoolCode}&MLSV_YMD=${ymd}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('급식 API 요청 실패');
  const data = await res.json();
  return data;
}

// 급식 데이터 파싱
function parseMealData(data) {
  if (!data.mealServiceDietInfo || data.mealServiceDietInfo[0].head[1].RESULT.CODE !== 'INFO-000') {
    return '오늘은 급식 정보가 없습니다.';
  }
  const mealRows = data.mealServiceDietInfo[1].row;
  return mealRows.map(row => {
    const mealName = row.MMEAL_SC_NM;
    const menu = row.DDISH_NM.replace(/<br\/>/g, '<br>').replace(/\./g, '').replace(/\s+/g, ' ');
    return `<b>${mealName}</b><br>${menu}`;
  }).join('<hr>');
}

// DOM 요소
const form = document.getElementById('meal-form');
const resultDiv = document.getElementById('result');

// 폼 제출 시 급식 조회 (당일)
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  resultDiv.innerHTML = '조회 중...';
  
  try {
    const data = await fetchMeal();
    const today = new Date();
    const todayStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    resultDiv.innerHTML = `<div style='font-size:15px;margin-bottom:8px;'><b>${SCHOOL_INFO.schoolName}</b> - ${todayStr}</div>` + parseMealData(data);
  } catch (err) {
    resultDiv.innerHTML = err.message || 'API 요청 중 오류가 발생했습니다.';
  }
});

// 페이지 로드 시 자동으로 급식 조회
window.addEventListener('load', async () => {
  resultDiv.innerHTML = '오늘의 급식을 불러오는 중...';
  try {
    const data = await fetchMeal();
    const today = new Date();
    const todayStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    resultDiv.innerHTML = `<div style='font-size:15px;margin-bottom:8px;'><b>${SCHOOL_INFO.schoolName}</b> - ${todayStr}</div>` + parseMealData(data);
  } catch (err) {
    resultDiv.innerHTML = err.message || 'API 요청 중 오류가 발생했습니다.';
  }
});

