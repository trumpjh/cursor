// NEIS OpenAPI 키를 직접 코드에 하드코딩
const API_KEY = 'b73f7206adf743c7b18aec1ab514d19b';

// 지역명 → NEIS 지역코드 매핑
const regionToCode = {
  '서울특별시': 'B10',
  '부산광역시': 'C10',
  '대구광역시': 'D10',
  '인천광역시': 'E10',
  '광주광역시': 'F10',
  '대전광역시': 'G10',
  '울산광역시': 'H10',
  '세종특별자치시': 'I10',
  '경기도': 'J10',
  '강원도': 'K10',
  '충청북도': 'M10',
  '충청남도': 'N10',
  '전라북도': 'P10',
  '전라남도': 'Q10',
  '경상북도': 'R10',
  '경상남도': 'S10',
  '제주특별자치도': 'T10',
};

// 고등학교 목록 불러오기 (지역별)
async function fetchHighSchools(regionName) {
  const officeCode = regionToCode[regionName];
  if (!officeCode) return [];
  const url = `https://open.neis.go.kr/hub/schoolInfo?KEY=${API_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${officeCode}&SCHUL_KND_SC_NM=고등학교&pSize=1000`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (!data.schoolInfo || data.schoolInfo[0].head[1].RESULT.CODE !== 'INFO-000') return [];
  return data.schoolInfo[1].row;
}

// 급식 정보 조회
async function fetchMeal(officeCode, schoolCode, date) {
  const ymd = date.replace(/-/g, '');
  const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${API_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&MLSV_YMD=${ymd}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('급식 API 요청 실패');
  const data = await res.json();
  return data;
}

// 급식 데이터 파싱
function parseMealData(data) {
  if (!data.mealServiceDietInfo || data.mealServiceDietInfo[0].head[1].RESULT.CODE !== 'INFO-000') {
    return '해당 날짜의 급식 정보가 없습니다.';
  }
  const mealRows = data.mealServiceDietInfo[1].row;
  return mealRows.map(row => {
    const mealName = row.MMEAL_SC_NM;
    const menu = row.DDISH_NM.replace(/<br\/>/g, '<br>').replace(/\./g, '').replace(/\s+/g, ' ');
    return `<b>${mealName}</b><br>${menu}`;
  }).join('<hr>');
}

// DOM 요소
const regionSelect = document.getElementById('region');
const schoolSelect = document.getElementById('school-name');
const form = document.getElementById('meal-form');
const resultDiv = document.getElementById('result');

// 지역 선택 시 고등학교 목록 갱신
regionSelect.addEventListener('change', async () => {
  const region = regionSelect.value;
  schoolSelect.innerHTML = '<option value="">불러오는 중...</option>';
  if (!region) {
    schoolSelect.innerHTML = '<option value="">먼저 지역을 선택하세요</option>';
    return;
  }
  try {
    const schools = await fetchHighSchools(region);
    if (schools.length === 0) {
      schoolSelect.innerHTML = '<option value="">해당 지역에 고등학교가 없습니다</option>';
      return;
    }
    schoolSelect.innerHTML = '<option value="">고등학교 선택</option>' +
      schools.map(s => `<option value="${s.ATPT_OFCDC_SC_CODE}|${s.SD_SCHUL_CODE}|${s.SCHUL_NM}">${s.SCHUL_NM}</option>`).join('');
  } catch {
    schoolSelect.innerHTML = '<option value="">학교 목록을 불러올 수 없습니다</option>';
  }
});

// 폼 제출 시 급식 조회
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  resultDiv.innerHTML = '조회 중...';
  const schoolValue = schoolSelect.value;
  const date = document.getElementById('date').value;
  if (!schoolValue || !date) {
    resultDiv.innerHTML = '모든 항목을 입력해주세요.';
    return;
  }
  const [officeCode, schoolCode, schoolName] = schoolValue.split('|');
  try {
    const data = await fetchMeal(officeCode, schoolCode, date);
    resultDiv.innerHTML = `<div style='font-size:15px;margin-bottom:8px;'><b>${schoolName}</b> (${schoolCode})</div>` + parseMealData(data);
  } catch (err) {
    resultDiv.innerHTML = err.message || 'API 요청 중 오류가 발생했습니다.';
  }
});

