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
  let data;
  try {
    data = await res.json();
  } catch {
    return [];
  }
  if (!data.schoolInfo || !data.schoolInfo[0]?.head?.[1]?.RESULT || data.schoolInfo[0].head[1].RESULT.CODE !== 'INFO-000') return [];
  return data.schoolInfo[1]?.row || [];
}

// 급식 정보 조회
async function fetchMeal(officeCode, schoolCode, date) {
  const ymd = date.replace(/-/g, '');
  const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${API_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&MLSV_YMD=${ymd}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP 오류: ${res.status} ${res.statusText}`);
  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`응답을 JSON으로 파싱하지 못했습니다. 원문: ${raw.slice(0, 200)}...`);
  }
  // 진단용 로그
  console.log('NEIS 응답:', data);
  return data;
}

// 급식 데이터 파싱
function parseMealData(data) {
  // mealServiceDietInfo가 없으면 가능한 오류 메시지를 유추해서 보여준다
  if (!data.mealServiceDietInfo) {
    const head = data?.RESULT || data?.mealServiceDietInfo?.[0]?.head;
    let code, msg;
    if (Array.isArray(head)) {
      const result = head.find(h => h.RESULT)?.RESULT;
      code = result?.CODE; msg = result?.MSG;
    } else if (head) {
      code = head.CODE; msg = head.MSG;
    }
    return `급식 정보를 찾을 수 없습니다. (API 응답 구조 오류${code ? ` / 코드: ${code}` : ''}${msg ? ` / 메시지: ${msg}` : ''})`;
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
const regionSelect = document.getElementById('region');
const schoolSelect = document.getElementById('school-name');
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

// 지역 선택 시 고등학교 목록 갱신 + 대양고 자동 선택
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

    // 부산이면 대양고등학교 자동 선택 시도
    if (region === '부산광역시') {
      const options = Array.from(schoolSelect.options);
      const dy = options.find(o => o.textContent.includes('대양고'));
      if (dy) {
        schoolSelect.value = dy.value;
      }
    }
  } catch (e) {
    console.error(e);
    schoolSelect.innerHTML = '<option value="">학교 목록을 불러올 수 없습니다</option>';
  }
});

// 폼 제출 시 급식 조회
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  resultDiv.innerHTML = '조회 중...';
  const schoolValue = schoolSelect.value;
  const date = dateInput.value;
  if (!schoolValue || !date) {
    resultDiv.innerHTML = '모든 항목을 입력해주세요.';
    return;
  }
  const [officeCode, schoolCode, schoolName] = schoolValue.split('|');
  try {
    const data = await fetchMeal(officeCode, schoolCode, date);
    const mealContent = parseMealData(data);
    resultDiv.innerHTML = `<div style='font-size:15px;margin-bottom:8px;'><b>${schoolName}</b> - ${formatDate(date)}</div>${mealContent}`;
  } catch (err) {
    resultDiv.innerHTML = err.message || 'API 요청 중 오류가 발생했습니다.';
  }
});

// 페이지 로드 시: 기본 지역 선택 반영하여 학교 목록 자동 로드
window.addEventListener('load', () => {
  const event = new Event('change');
  regionSelect.dispatchEvent(event);
});

