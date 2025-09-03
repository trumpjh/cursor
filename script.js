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
  
  console.log('API 요청 URL:', url); // 디버깅용
  
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP 오류: ${res.status} ${res.statusText}`);
  
  const data = await res.json();
  console.log('API 응답 데이터:', data); // 디버깅용
  
  return data;
}

// 급식 데이터 파싱
function parseMealData(data) {
  console.log('파싱 시작:', data); // 디버깅용
  
  // API 응답 구조 확인
  if (!data.mealServiceDietInfo) {
    console.log('mealServiceDietInfo가 없음');
    return '급식 정보를 찾을 수 없습니다. (API 응답 구조 오류)';
  }
  
  // 헤더 정보 확인
  const header = data.mealServiceDietInfo[0];
  if (!header || !header.head || !header.head[1] || !header.head[1].RESULT) {
    console.log('헤더 정보가 없음');
    return 'API 응답 형식이 올바르지 않습니다.';
  }
  
  const result = header.head[1].RESULT;
  if (result.CODE !== 'INFO-000') {
    console.log('API 오류 코드:', result.CODE, result.MSG);
    return `API 오류: ${result.CODE} - ${result.MSG || '알 수 없는 오류'}`;
  }
  
  // 급식 데이터 확인
  if (!data.mealServiceDietInfo[1] || !data.mealServiceDietInfo[1].row) {
    console.log('급식 데이터가 없음');
    return '오늘은 급식 정보가 없습니다.';
  }
  
  const mealRows = data.mealServiceDietInfo[1].row;
  console.log('급식 행 데이터:', mealRows); // 디버깅용
  
  if (!Array.isArray(mealRows) || mealRows.length === 0) {
    return '오늘은 급식 정보가 없습니다.';
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
    const mealContent = parseMealData(data);
    resultDiv.innerHTML = `<div style='font-size:15px;margin-bottom:8px;'><b>${SCHOOL_INFO.schoolName}</b> - ${todayStr}</div>${mealContent}`;
  } catch (err) {
    console.error('급식 조회 오류:', err); // 디버깅용
    resultDiv.innerHTML = `<div style='color: red;'>오류: ${err.message}</div><br><small>개발자 도구의 콘솔을 확인해주세요.</small>`;
  }
});

// 페이지 로드 시 자동으로 급식 조회
window.addEventListener('load', async () => {
  resultDiv.innerHTML = '오늘의 급식을 불러오는 중...';
  try {
    const data = await fetchMeal();
    const today = new Date();
    const todayStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    const mealContent = parseMealData(data);
    resultDiv.innerHTML = `<div style='font-size:15px;margin-bottom:8px;'><b>${SCHOOL_INFO.schoolName}</b> - ${todayStr}</div>${mealContent}`;
  } catch (err) {
    console.error('자동 급식 조회 오류:', err); // 디버깅용
    resultDiv.innerHTML = `<div style='color: red;'>오류: ${err.message}</div><br><small>개발자 도구의 콘솔을 확인해주세요.</small>`;
  }
});

