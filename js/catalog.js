/* GoFit Planner — equipment catalog (data only). Plan symbols live in symbols.js, real 3D models in /models. */
(function () {
'use strict';
const GP = window.GP;
GP.CATS = [
  { id: 'fav', name: '★ 즐겨찾기' },
  { id: 'cardio', name: '유산소' },
  { id: 'machine', name: '웨이트 머신' },
  { id: 'plate', name: '플레이트 로디드' },
  { id: 'cable', name: '케이블' },
  { id: 'rack', name: '랙·스미스' },
  { id: 'bench', name: '벤치' },
  { id: 'storage', name: '프리웨이트 보관' },
  { id: 'func', name: '기능성 존' },
  { id: 'stretch', name: '스트레칭·케어' },
  { id: 'air', name: '에어 트레이너' },
  { id: 'facility', name: '시설·설비' },
  { id: 'special', name: '특수 물품' },
  { id: 'custom', name: '내 물품' },
];
GP.EQUIP_CATS = new Set(['cardio', 'machine', 'plate', 'cable', 'rack', 'bench', 'storage', 'func', 'stretch', 'air']);
const CAT = GP.CAT = {};
/* sizes follow the generic 3D models in models/basic (m). T(id, name, cat, w, d, h, clearance [front, back, left, right], opts) — w = width (local X), d = depth (local Z, +Z is the user/access side) */
const T = (id, name, cat, w, d, h, cl, o) => { CAT[id] = Object.assign({ id, name, cat, w, d, h, kw: '', pw: 0, mount: 'floor', y: 0 }, o || {}, { cl: { f: cl[0], b: cl[1], l: cl[2], r: cl[3] } }); };
T('treadmill', '트레드밀', 'cardio', 0.93, 2.17, 1.65, [2, 0.3, 0.5, 0.5], {pw:3000,kw:'런닝머신 러닝머신 treadmill'});
T('treadmill_incline', '인클라인 트레드밀', 'cardio', 1.05, 1.25, 1.63, [2, 0.3, 0.5, 0.5], {pw:3500,kw:'경사 인클라인 트레이너'});
T('treadmill_curve', '무동력 트레드밀', 'cardio', 0.8, 1.68, 1.62, [1.5, 0.3, 0.5, 0.5], {kw:'커브드 무동력 곡선'});
T('bike', '실내 사이클', 'cardio', 0.64, 1.14, 1.52, [0.6, 0.3, 0.3, 0.3], {kw:'업라이트 바이크 자전거 bike'});
T('bike_recumbent', '좌식 사이클', 'cardio', 0.59, 1.68, 1.36, [0.6, 0.3, 0.4, 0.4], {kw:'리컴번트 좌식 바이크'});
T('bike_spin', '스핀 바이크', 'cardio', 0.56, 1.33, 1.22, [0.5, 0.3, 0.3, 0.3], {kw:'스피닝 스핀'});
T('bike_air', '에어 바이크', 'cardio', 0.69, 1.03, 1.44, [0.6, 0.3, 0.4, 0.4], {kw:'에어바이크 팬 air bike'});
T('elliptical', '일립티컬', 'cardio', 0.61, 2.12, 1.67, [0.6, 0.3, 0.5, 0.5], {kw:'크로스트레이너 elliptical'});
T('stepmill', '스텝밀', 'cardio', 0.83, 1.59, 2.1, [1, 0.3, 0.5, 0.5], {pw:1500,kw:'천국의계단 스테어 클라이머 stair'});
T('rower', '로잉머신', 'cardio', 0.6, 2.45, 0.55, [1, 0.3, 0.6, 0.6], {kw:'로잉 조정 rowing'});
T('skierg', '스키 머신', 'cardio', 0.6, 1.29, 2.16, [1, 0.3, 0.5, 0.5], {kw:'스키에르그 ski'});
T('vclimber', '버티컬 클라이머', 'air', 1.12, 1.24, 2.46, [0.8, 0.3, 0.4, 0.4], {kw:'파워타워 클라이머 수직'});
T('airclimber', '에어 클라이머', 'air', 0.75, 1.46, 2.12, [0.8, 0.3, 0.4, 0.4], {kw:'파워클라이머 스텝 climber'});
T('swimtrainer', '스윔 트레이너', 'air', 0.76, 2.53, 0.8, [0.8, 0.5, 0.4, 0.4], {kw:'파워스위머 수영 swim'});
T('chest', '체스트 프레스', 'machine', 1.53, 1.05, 1.55, [0.6, 0.15, 0.6, 0.6], {kw:'가슴 chest press'});
T('chest_incline', '인클라인 체스트 프레스', 'machine', 1.7, 1.22, 2.0, [0.6, 0.15, 0.6, 0.6], {kw:'인클라인 가슴'});
T('shoulder', '숄더 프레스', 'machine', 1.41, 1.43, 1.71, [0.6, 0.15, 0.6, 0.6], {kw:'어깨 shoulder press'});
T('multipress', '멀티 프레스', 'machine', 1.1, 1.68, 1.58, [0.6, 0.15, 0.6, 0.6], {kw:'체스트 숄더 겸용 multi press'});
T('pecfly', '펙덱 플라이', 'machine', 0.86, 1.4, 2.34, [0.6, 0.15, 0.7, 0.7], {kw:'버터플라이 가슴 pec deck'});
T('pecrear', '펙덱 & 리어델트', 'machine', 0.86, 1.28, 2.11, [0.6, 0.6, 0.7, 0.7], {kw:'리어델트 겸용 pec rear'});
T('latpull', '랫풀다운', 'machine', 1.2, 1.43, 2.25, [0.9, 0.15, 0.6, 0.6], {kw:'랫 풀 다운 등 lat pulldown'});
T('longpull', '롱풀', 'machine', 0.85, 2.22, 2.27, [0.5, 0.15, 0.5, 0.5], {kw:'시티드 케이블 로우 롱풀 row'});
T('latlong', '랫풀다운 & 롱풀', 'machine', 1.58, 2.01, 2.24, [0.6, 0.15, 0.6, 0.6], {kw:'겸용 랫풀 롱풀'});
T('seatedrow', '시티드 로우', 'machine', 0.87, 1.29, 1.94, [0.6, 0.15, 0.6, 0.6], {kw:'로우 등 seated row'});
T('seateddip', '시티드 딥', 'machine', 1.13, 0.94, 1.48, [0.6, 0.15, 0.6, 0.6], {kw:'딥스 삼두 dip'});
T('assistdip', '어시스트 친딥', 'machine', 1.15, 1.28, 2.19, [0.8, 0.15, 0.5, 0.5], {kw:'어시스트 풀업 친업 딥 assist'});
T('armcurl', '암컬', 'machine', 1.06, 1.32, 1.55, [0.6, 0.15, 0.5, 0.5], {kw:'이두 암컬 biceps curl'});
T('triceps', '트라이셉스 익스텐션', 'machine', 1.04, 1.06, 1.4, [0.6, 0.15, 0.5, 0.5], {kw:'삼두 triceps'});
T('lateral_seat', '레터럴 레이즈 (시티드)', 'machine', 0.95, 1.1, 1.4, [0.6, 0.15, 0.7, 0.7], {kw:'어깨 측면 lateral raise'});
T('lateral_stand', '레터럴 레이즈 (스탠딩)', 'machine', 0.8, 1.5, 2.06, [0.8, 0.15, 0.7, 0.7], {kw:'어깨 측면 스탠딩'});
T('legext', '레그 익스텐션', 'machine', 1.07, 1.15, 1.55, [0.9, 0.15, 0.6, 0.6], {kw:'하체 허벅지 leg extension'});
T('legcurl_seat', '시티드 레그컬', 'machine', 1.06, 1.43, 1.55, [0.9, 0.15, 0.6, 0.6], {kw:'햄스트링 leg curl seated'});
T('legextcurl', '레그 익스텐션 & 레그컬', 'machine', 1.08, 1.41, 1.55, [0.9, 0.15, 0.6, 0.6], {kw:'겸용 익스텐션 레그컬'});
T('legcurl_lying', '라잉 레그컬', 'machine', 0.99, 1.64, 1.68, [0.6, 0.3, 0.6, 0.6], {kw:'누워서 레그컬 lying'});
T('legpress_seat', '시티드 레그프레스', 'machine', 1.13, 1.9, 1.75, [0.6, 0.15, 0.6, 0.6], {kw:'하체 레그프레스 seated leg press'});
T('totalhip', '토탈 힙', 'machine', 1.12, 1.02, 1.84, [0.8, 0.15, 0.7, 0.7], {kw:'엉덩이 둔근 hip'});
T('innerthigh', '이너 싸이', 'machine', 0.7, 1.53, 1.55, [0.6, 0.15, 0.6, 0.6], {kw:'내전근 어덕터 inner thigh adductor'});
T('outerthigh', '아웃 싸이', 'machine', 0.71, 1.53, 1.55, [0.6, 0.15, 0.6, 0.6], {kw:'외전근 어브덕터 outer thigh abductor'});
T('thighdual', '이너 & 아웃 싸이', 'machine', 1.43, 1.46, 1.55, [0.6, 0.15, 0.6, 0.6], {kw:'겸용 내전 외전'});
T('calfsquat', '스탠딩 카프 & 스쿼트', 'machine', 1.15, 1.15, 1.58, [0.8, 0.15, 0.6, 0.6], {kw:'종아리 카프 스쿼트 calf'});
T('abcrunch', '앱도미널 크런치', 'machine', 0.92, 1.56, 1.55, [0.6, 0.15, 0.6, 0.6], {kw:'복근 크런치 abdominal'});
T('backext', '백 익스텐션', 'machine', 1.1, 1.33, 1.63, [0.6, 0.5, 0.6, 0.6], {kw:'허리 등 back extension'});
T('abback', '앱도미널 & 백 익스텐션', 'machine', 0.97, 1.3, 1.55, [0.6, 0.5, 0.6, 0.6], {kw:'겸용 복근 허리'});
T('torso', '로터리 토르소', 'machine', 1.02, 1.2, 1.55, [0.6, 0.15, 0.6, 0.6], {kw:'회전 옆구리 torso rotary'});
T('legpress_plate', '파워 레그프레스', 'plate', 1.5, 2.24, 1.65, [0.6, 0.3, 0.6, 0.6], {heavy:true,kw:'45도 레그프레스 power leg press'});
T('legpress_linear', '리니어 레그프레스', 'plate', 1.65, 2.48, 1.45, [0.6, 0.3, 0.6, 0.6], {heavy:true,kw:'리니어 레그프레스 linear'});
T('hacksquat', '핵 스쿼트', 'plate', 1.5, 2, 1.35, [0.6, 0.3, 0.6, 0.6], {heavy:true,kw:'핵스쿼트 hack squat'});
T('hackpress', '핵 프레스', 'plate', 1.55, 2.12, 1.48, [0.6, 0.3, 0.6, 0.6], {heavy:true,kw:'핵 프레스 hack press'});
T('vsquat', 'V 스쿼트', 'plate', 1.26, 1.89, 1.72, [0.6, 0.5, 0.6, 0.6], {heavy:true,kw:'브이스쿼트 v squat'});
T('hipthrust', '힙 쓰러스트', 'plate', 1.49, 1.73, 1.03, [0.6, 0.3, 0.6, 0.6], {heavy:true,kw:'힙쓰러스트 둔근 hip thrust'});
T('hipthrust_stand', '스탠딩 힙 쓰러스트', 'plate', 1.23, 1.2, 1.61, [0.8, 0.3, 0.5, 0.5], {heavy:true,kw:'스탠딩 힙쓰러스트'});
T('chest_plate', '체스트 프레스 (플레이트)', 'plate', 1.21, 1.23, 1.82, [0.6, 0.3, 0.7, 0.7], {heavy:true,kw:'가슴 플레이트 체스트'});
T('incline_plate', '인클라인 체스트 프레스 (플레이트)', 'plate', 1.59, 1.13, 1.93, [0.6, 0.3, 0.7, 0.7], {heavy:true,kw:'인클라인 플레이트'});
T('leverage_chest', '레버리지 체스트 프레스', 'plate', 1.61, 1.14, 1.85, [0.6, 0.3, 0.7, 0.7], {heavy:true,kw:'레버리지 가슴'});
T('horiz_bench', '호리존탈 벤치프레스', 'plate', 1.45, 1.55, 1.46, [0.6, 0.3, 0.7, 0.7], {heavy:true,kw:'수평 벤치프레스 horizontal'});
T('pecfly_plate', '펙덱 플라이 (플레이트)', 'plate', 1.58, 1.93, 1.71, [0.6, 0.3, 0.8, 0.8], {heavy:true,kw:'플라이 플레이트'});
T('pectoral_fly', '펙토랄 플라이', 'plate', 2.16, 2.15, 1.08, [0.6, 0.3, 0.4, 0.4], {heavy:true,kw:'누워서 플라이 pectoral'});
T('shoulder_plate', '숄더 프레스 (플레이트)', 'plate', 1.54, 1.34, 1.26, [0.6, 0.3, 0.7, 0.7], {heavy:true,kw:'어깨 플레이트'});
T('viking', '바이킹 프레스', 'plate', 1.39, 1.52, 1.59, [0.8, 0.3, 0.5, 0.5], {heavy:true,kw:'바이킹 프레스 스탠딩'});
T('smith_shoulder', '스미스 숄더 프레스', 'plate', 1.67, 1.71, 2.11, [0.6, 0.3, 0.5, 0.5], {heavy:true,kw:'듀얼 파워 스미스 숄더'});
T('lateral_plate', '레터럴 레이즈 (플레이트)', 'plate', 1.45, 1.15, 1.22, [0.6, 0.3, 0.6, 0.6], {heavy:true,kw:'측면 어깨 플레이트'});
T('bentover_lateral', '벤트오버 레터럴 레이즈', 'plate', 1.14, 2.04, 1.61, [0.6, 0.3, 0.7, 0.7], {heavy:true,kw:'리어 델트 벤트오버'});
T('frontrow', '프론트 로우', 'plate', 1.37, 1.4, 1.25, [0.6, 0.3, 0.6, 0.6], {heavy:true,kw:'로우 등 front row'});
T('highrow', '하이 로우', 'plate', 1.22, 1.91, 2.01, [0.6, 0.3, 0.6, 0.6], {heavy:true,kw:'하이로우 등'});
T('lowrow', '로우 로우', 'plate', 1.38, 1.45, 1.65, [0.6, 0.3, 0.6, 0.6], {heavy:true,kw:'로우로우 등 low row'});
T('isorow', '아이소 리니어 로우', 'plate', 1.46, 1.54, 1.32, [0.6, 0.3, 0.6, 0.6], {heavy:true,kw:'아이소 로우 iso'});
T('extremerow', '익스트림 로우', 'plate', 1.63, 1.95, 1.38, [0.6, 0.3, 0.6, 0.6], {heavy:true,kw:'익스트림 로우'});
T('tbar_plate', 'T바 로우 (플레이트)', 'plate', 0.76, 2.06, 0.55, [0.6, 0.3, 0.6, 0.6], {heavy:true,kw:'티바로우 T-bar'});
T('rotary_pulldown', '로터리 풀다운', 'plate', 1.09, 1.27, 2.04, [0.6, 0.3, 0.6, 0.6], {heavy:true,kw:'풀다운 로터리 pulldown'});
T('kneel_curl', '닐링 레그컬', 'plate', 1.54, 1.0, 1.24, [0.6, 0.3, 0.5, 0.5], {heavy:true,kw:'무릎 레그컬 kneeling'});
T('abductor_stand', '스탠딩 어브덕터', 'plate', 0.55, 1.28, 1.43, [0.6, 0.3, 0.7, 0.7], {heavy:true,kw:'스탠딩 외전 abductor'});
T('link_abductor', '링크 어브덕터', 'plate', 1.18, 1.34, 1.18, [0.6, 0.3, 0.6, 0.6], {heavy:true,kw:'링크 외전'});
T('fullbody', '풀바디 트레이너', 'plate', 1.68, 1.44, 0.51, [0.8, 0.8, 0.6, 0.6], {heavy:true,kw:'풀바디 랜드마인 full body'});
T('crossover', '케이블 크로스오버', 'cable', 3.51, 1.18, 2.38, [1.5, 0.1, 0.3, 0.3], {kw:'크로스오버 케이블 cable crossover'});
T('dualpulley', '듀얼 풀리', 'cable', 1.67, 1.1, 2.37, [1.5, 0.1, 0.4, 0.4], {kw:'펑셔널 트레이너 듀얼 풀리 dual'});
T('chestweight', '체스트 웨이트', 'cable', 1.62, 0.85, 2.42, [1.5, 0.1, 0.4, 0.4], {kw:'벽부착 케이블 chest weight'});
T('multistation', '멀티 스테이션', 'cable', 3.44, 1.46, 2.41, [0.9, 0.1, 0.5, 0.5], {kw:'멀티짐 멀티스테이션 multi'});
T('powerrack', '파워랙', 'rack', 1.81, 1.93, 2.33, [1.2, 0.3, 0.5, 0.5], {heavy:true,kw:'파워랙 스쿼트 power rack'});
T('halfrack', '하프랙', 'rack', 1.81, 1.47, 2.33, [1.2, 0.3, 0.5, 0.5], {heavy:true,kw:'하프랙 half rack'});
T('squatrack', '스쿼트랙', 'rack', 1.76, 1.72, 1.89, [1.2, 0.3, 0.5, 0.5], {heavy:true,kw:'스쿼트랙 squat'});
T('smith', '스미스 머신', 'rack', 2.21, 1.41, 2.23, [0.9, 0.6, 0.5, 0.5], {heavy:true,kw:'스미스 smith'});
T('smith_right', '직각 스미스 머신', 'rack', 2.29, 1.29, 2.34, [0.9, 0.3, 0.5, 0.5], {heavy:true,kw:'직각 스미스'});
T('multirack', '멀티랙', 'rack', 2.02, 2.22, 2.33, [1.2, 0.3, 0.5, 0.5], {heavy:true,kw:'멀티랙 랙 스미스 multi rack'});
T('monsterrack', '몬스터랙', 'rack', 4.99, 2.1, 2.61, [1.2, 1.2, 0.5, 0.5], {heavy:true,fit:'actual',kw:'몬스터랙 리그 rig monster'});
T('rig', '펑셔널 리그', 'rack', 4.42, 2.06, 2.61, [1.2, 1.2, 0.5, 0.5], {heavy:true,fit:'actual',kw:'철봉 리그 functional rig'});
T('allinone', '올인원 트레이너', 'rack', 2.28, 2.04, 2.44, [1.2, 0.3, 0.4, 0.4], {heavy:true,kw:'올인원 랙 케이블 all in one'});
T('chindip', '친딥 레그레이즈', 'rack', 1.13, 1.25, 2.28, [0.8, 0.2, 0.4, 0.4], {kw:'치닝디핑 턱걸이 파워타워 chin dip'});
T('bench_flat', '평벤치', 'bench', 0.78, 1.17, 0.43, [0.6, 0.6, 0.6, 0.6], {kw:'플랫 벤치 flat bench'});
T('bench_adj', '각도조절벤치', 'bench', 0.78, 1.35, 0.45, [0.6, 0.6, 0.6, 0.6], {kw:'멀티벤치 조절벤치 인클라인 adjustable'});
T('bench_util', '직각벤치', 'bench', 0.78, 0.9, 0.9, [0.6, 0.6, 0.6, 0.6], {kw:'유틸리티 직각 벤치'});
T('benchpress', '벤치프레스', 'bench', 1.3, 1.26, 1.26, [0.6, 0.6, 0.5, 0.5], {heavy:true,kw:'올림픽 플랫 벤치프레스 bench press'});
T('bench_incline', '인클라인 벤치프레스', 'bench', 1.3, 1.42, 1.4, [0.6, 0.6, 0.5, 0.5], {heavy:true,kw:'올림픽 인클라인 벤치'});
T('bench_decline', '디클라인 벤치프레스', 'bench', 1.3, 1.55, 1.26, [0.6, 0.6, 0.5, 0.5], {heavy:true,kw:'올림픽 디클라인 벤치'});
T('ab_decline', '복근 디클라인 벤치', 'bench', 0.78, 1.68, 0.78, [0.6, 0.5, 0.5, 0.5], {kw:'복근 디클라인 싯업'});
T('situp1', '싯업 벤치 (1인)', 'bench', 0.66, 1.58, 0.98, [0.6, 0.5, 0.5, 0.5], {kw:'싯업 복근 윗몸'});
T('situp2', '싯업 벤치 (2인)', 'bench', 1.34, 1.58, 0.98, [0.6, 0.5, 0.4, 0.4], {kw:'싯업 2인'});
T('romanchair', '로만 체어', 'bench', 0.83, 1.27, 0.71, [0.8, 0.8, 0.4, 0.4], {kw:'백익스텐션 하이퍼 로만체어 roman'});
T('curlbench', '암컬 벤치', 'bench', 0.79, 1.2, 1.09, [0.6, 0.6, 0.4, 0.4], {kw:'프리처 암컬 컬 벤치 preacher'});
T('curlbench_adj', '조절식 암컬 벤치', 'bench', 0.9, 0.99, 1.14, [0.6, 0.6, 0.4, 0.4], {heavy:true,kw:'조절식 암컬 플레이트'});
T('tbar', 'T바 로우', 'bench', 0.76, 1.89, 0.39, [0.6, 0.5, 0.6, 0.6], {heavy:true,kw:'티바로우 랜드마인 T-bar'});
T('twist', '트위스트', 'bench', 0.66, 1.3, 1.28, [0.6, 0.3, 0.4, 0.4], {kw:'트위스트 허리 회전 twist'});
T('dbrack2', '덤벨랙 (2단)', 'storage', 2.3, 0.6, 0.83, [1.5, 0, 0.3, 0.3], {heavy:true,fit:'actual',kw:'덤벨 랙 dumbbell'});
T('dbrack3', '덤벨랙 (3단)', 'storage', 2.19, 0.71, 1.03, [1.5, 0, 0.3, 0.3], {heavy:true,fit:'actual',kw:'덤벨 랙 3단'});
T('platetree', '원판 거치대', 'storage', 0.78, 0.6, 0.93, [0.6, 0.6, 0.6, 0.6], {heavy:true,kw:'원판 웨이트트리 plate tree'});
T('barbellrack', '바벨 거치대', 'storage', 1.02, 0.86, 1.4, [0.6, 0.6, 0.3, 0.3], {heavy:true,kw:'바벨랙 바 거치대 barbell rack'});
T('fixedbarbell', '고정식 바벨 랙', 'storage', 1.24, 0.94, 1.58, [1.2, 0, 0.3, 0.3], {heavy:true,kw:'고정식 바벨 fixed barbell'});
T('kettlebell', '케틀벨 랙', 'storage', 1.4, 0.78, 1.01, [1, 0, 0.3, 0.3], {heavy:true,kw:'케틀벨 kettlebell'});
T('medball', '메디신볼 랙', 'storage', 0.58, 0.38, 1.52, [0.8, 0, 0.3, 0.3], {heavy:true,kw:'메디신볼 월볼 medicine ball'});
T('platform', '데드리프트 플랫폼', 'storage', 2.4, 2.4, 0.05, [0.6, 0.6, 0.6, 0.6], {heavy:true,flat:true,surface:true,fit:'actual',kw:'플랫폼 데드리프트 역도 platform'});
T('turf', '인조잔디 트랙', 'func', 8, 1.8, 0.02, [0, 0, 0, 0], {flat:true,fit:'actual',kw:'터프 썰매 잔디 turf'});
T('sled', '슬레드', 'func', 0.66, 0.94, 0.78, [2, 0.5, 0.2, 0.2], {heavy:true,kw:'썰매 푸시 슬레드 sled'});
T('plyobox', '플라이오 박스', 'func', 0.76, 0.6, 0.5, [0.8, 0.8, 0.3, 0.3], {kw:'플라이오 점프 박스 plyo box'});
T('battlerope', '배틀로프', 'func', 0.6, 5, 0.2, [1.2, 0, 0.5, 0.5], {flat:true,kw:'배틀로프 로프 battle rope'});
T('stretchzone', '스트레칭 존', 'func', 3, 2, 0.02, [0, 0, 0, 0], {flat:true,fit:'actual',kw:'스트레칭 매트 요가 stretch'});
T('ballrack', '짐볼·폼롤러 거치대', 'func', 1.82, 0.64, 1.82, [0.6, 0, 0.2, 0.2], {kw:'짐볼 폼롤러 거치대'});
T('sandbag', '샌드백', 'func', 0.36, 0.36, 1.8, [0.8, 0.8, 0.8, 0.8], {mount:'ceil',kw:'샌드백 복싱 sandbag'});
T('stretchmachine', '스트레칭 머신', 'stretch', 0.87, 1.66, 1.86, [0.6, 0.3, 0.4, 0.4], {pw:100,kw:'스트레칭 머신 고플렉스'});
T('mirror_t', '스트레칭 미러 (T형)', 'stretch', 1.46, 1.46, 2.09, [0.8, 0.1, 0.1, 0.1], {pw:200,kw:'미러 스트레칭 부스 T'});
T('mirror_lr', '스트레칭 미러 (LR형)', 'stretch', 1.46, 0.85, 2.09, [0.8, 0.1, 0.1, 0.1], {pw:200,kw:'미러 스트레칭 LR'});
T('vibration', '진동 운동기', 'stretch', 0.96, 0.83, 1.51, [0.6, 0.3, 0.3, 0.3], {pw:1000,kw:'진동 플레이트 바이브라핏 vibration'});
T('inbody', '체성분 측정기', 'stretch', 0.63, 0.76, 1.14, [0.6, 0.1, 0.2, 0.2], {pw:100,kw:'인바디 체성분 체중계 inbody'});
T('mirror', '벽 거울', 'facility', 3, 0.04, 1.9, [0, 0, 0, 0], {wall:true,fit:'actual',mount:'wall',y:0.3,kw:'거울 mirror'});
T('column', '기둥', 'facility', 0.6, 0.6, 2.8, [0, 0, 0, 0], {fit:'actual',hFromWall:true,kw:'기둥 column'});
T('outlet', '콘센트', 'facility', 0.12, 0.04, 0.12, [0, 0, 0, 0], {wall:true,mount:'wall',y:0.3,kw:'콘센트 전기 outlet 전원'});
T('logo', '로고', 'facility', 1.5, 0.03, 0.6, [0, 0, 0, 0], {wall:true,fit:'actual',mount:'wall',y:1.6,kw:'로고 간판 사인 logo'});
T('tv_wall', '벽걸이 TV', 'facility', 1.45, 0.06, 0.84, [0, 0, 0, 0], {wall:true,mount:'wall',y:1.4,pw:200,kw:'티비 tv 모니터 벽걸이'});
T('speaker_wall', '스피커 (벽)', 'facility', 0.25, 0.22, 0.38, [0, 0, 0, 0], {wall:true,mount:'wall',y:2.2,pw:60,kw:'스피커 음향 speaker'});
T('speaker_ceil', '스피커 (천장)', 'facility', 0.25, 0.25, 0.1, [0, 0, 0, 0], {wall:true,mount:'ceil',pw:30,kw:'천장 스피커'});
T('ac_wall', '벽걸이 에어컨', 'facility', 1, 0.25, 0.33, [0.5, 0, 0, 0], {wall:true,mount:'wall',y:2.3,pw:1800,kw:'에어컨 냉방 벽걸이 ac'});
T('ac_stand', '스탠드 에어컨', 'facility', 0.5, 0.4, 1.85, [0.8, 0, 0, 0], {pw:2500,kw:'에어컨 스탠드'});
T('ac_ceil', '천장형 에어컨', 'facility', 0.95, 0.95, 0.3, [0, 0, 0, 0], {wall:true,mount:'ceil',pw:3000,kw:'시스템 에어컨 천장 4way'});
T('light_ceil', '천장 조명', 'facility', 0.6, 0.6, 0.08, [0, 0, 0, 0], {wall:true,mount:'ceil',pw:50,kw:'조명 천장등 원형 light'});
T('light_line', '라인 조명', 'facility', 2.4, 0.08, 0.06, [0, 0, 0, 0], {wall:true,fit:'actual',mount:'ceil',pw:40,kw:'라인 조명 led'});
T('light_wall', '벽 조명', 'facility', 0.2, 0.12, 0.3, [0, 0, 0, 0], {wall:true,mount:'wall',y:2,pw:20,kw:'벽등 브라켓 조명'});
T('clock', '시계', 'facility', 0.4, 0.05, 0.4, [0, 0, 0, 0], {wall:true,mount:'wall',y:2.2,kw:'벽시계 clock 타이머'});
T('frame', '액자·포스터', 'facility', 0.7, 0.03, 1, [0, 0, 0, 0], {wall:true,fit:'actual',mount:'wall',y:1.3,kw:'액자 포스터 사진 frame'});
T('shelf_wall', '벽 선반', 'facility', 1.2, 0.25, 0.04, [0, 0, 0, 0], {wall:true,fit:'actual',surface:true,mount:'wall',y:1.5,kw:'벽선반 선반 shelf'});
T('desk', '인포데스크', 'special', 2, 0.7, 1.05, [1, 0.8, 0, 0], {fit:'actual',surface:true,params:[{k:'shape',label:'모양',type:'select',def:'straight',options:[['straight','일자형'],['L','ㄱ자형'],['U','ㄷ자형'],['round','라운드형'],['two','2단 카운터']]},{k:'body',label:'몸체 색',type:'color',def:'#b48a5e'},{k:'top',label:'상판 색',type:'color',def:'#ecebe6'}],pw:300,kw:'인포데스크 카운터 리셉션 데스크 counter'});
T('cabinet', '벽장·수납장', 'special', 1.2, 0.45, 2, [0.6, 0, 0, 0], {fit:'actual',params:[{k:'cols',label:'칸 수',type:'num',def:2,min:1,max:8,step:1},{k:'style',label:'문',type:'select',def:'door',options:[['door','여닫이 문'],['open','오픈형'],['glass','유리문']]},{k:'color',label:'색상',type:'color',def:'#e9e6df'}],kw:'벽장 수납장 캐비닛 장 cabinet'});
T('locker', '락커', 'special', 0.9, 0.5, 1.8, [0.8, 0, 0, 0], {fit:'actual',params:[{k:'cols',label:'가로 칸',type:'num',def:3,min:1,max:12,step:1},{k:'rows',label:'세로 칸',type:'num',def:2,min:1,max:6,step:1},{k:'color',label:'색상',type:'color',def:'#6b7580'}],kw:'락커 사물함 옷장 locker'});
T('shelf', '선반·수건장', 'special', 1.2, 0.4, 1.8, [0.6, 0, 0, 0], {fit:'actual',surface:true,params:[{k:'tiers',label:'단 수',type:'num',def:4,min:2,max:8,step:1},{k:'towel',label:'수건 놓기',type:'select',def:'no',options:[['no','없음'],['yes','수건']]},{k:'color',label:'색상',type:'color',def:'#2b2e33'}],kw:'선반 수건장 진열대 shelf towel'});
T('screen', '이동식 파티션', 'special', 1.2, 0.5, 1.6, [0, 0, 0, 0], {fit:'actual',params:[{k:'color',label:'색상',type:'color',def:'#5b6168'}],kw:'파티션 칸막이 가림막 screen'});
T('purifier', '정수기', 'special', 0.3, 0.45, 1.25, [0.6, 0, 0, 0], {params:[{k:'type',label:'형태',type:'select',def:'stand',options:[['stand','스탠드형'],['counter','카운터형']]}],pw:500,kw:'정수기 냉온수기 water'});
T('tv_stand', 'TV (스탠드)', 'special', 1.45, 0.5, 1.6, [0.8, 0, 0, 0], {pw:200,kw:'스탠드 티비 tv'});
T('monitor', 'PC 모니터', 'special', 0.6, 0.2, 0.45, [0, 0, 0, 0], {sitOn:true,pw:80,kw:'모니터 컴퓨터 pc'});
T('plant', '화분', 'special', 0.5, 0.5, 1.2, [0, 0, 0, 0], {sitOn:true,params:[{k:'size',label:'크기',type:'select',def:'m',options:[['s','작은 화분'],['m','중간'],['l','큰 나무']]}],kw:'화분 식물 나무 plant'});
T('sofa', '소파·벤치 의자', 'special', 1.9, 0.85, 0.85, [0.6, 0, 0, 0], {fit:'actual',params:[{k:'kind',label:'종류',type:'select',def:'sofa3',options:[['sofa2','2인 소파'],['sofa3','3인 소파'],['bench','벤치 의자']]},{k:'color',label:'색상',type:'color',def:'#5b6168'}],kw:'소파 의자 대기 벤치 sofa'});
T('showcase', '쇼케이스 냉장고', 'special', 1.2, 0.65, 1.9, [0.8, 0, 0, 0], {fit:'actual',params:[{k:'doors',label:'문',type:'num',def:2,min:1,max:4,step:1}],pw:400,kw:'쇼케이스 음료 냉장고'});
T('fridge', '냉장고', 'special', 0.8, 0.75, 1.85, [0.8, 0, 0, 0], {fit:'actual',params:[{k:'doors',label:'문',type:'num',def:2,min:1,max:4,step:1}],pw:300,kw:'냉장고 fridge'});
/* plan symbol family per type (see symbols.js) */
const FAM = {
  tread: 'treadmill treadmill_incline', treadCurve: 'treadmill_curve', bike: 'bike bike_spin', bikeRec: 'bike_recumbent', bikeAir: 'bike_air',
  ellip: 'elliptical', stair: 'stepmill', rower: 'rower', ski: 'skierg', climber: 'vclimber airclimber', swim: 'swimtrainer',
  sel: 'chest chest_incline shoulder multipress pecfly pecrear latpull latlong seatedrow seateddip assistdip armcurl triceps lateral_seat legext legcurl_seat legextcurl legpress_seat totalhip innerthigh outerthigh thighdual abcrunch backext abback torso',
  selLong: 'longpull legcurl_lying', selStand: 'lateral_stand calfsquat',
  plate: 'chest_plate incline_plate leverage_chest shoulder_plate pecfly_plate frontrow highrow lowrow rotary_pulldown lateral_plate kneel_curl link_abductor hipthrust hipthrust_stand abductor_stand viking fullbody',
  plateLong: 'legpress_plate legpress_linear hacksquat hackpress vsquat horiz_bench isorow extremerow tbar_plate bentover_lateral pectoral_fly smith_shoulder',
  cross: 'crossover', pulley: 'dualpulley chestweight', multi: 'multistation',
  rack: 'powerrack multirack allinone', halfrack: 'halfrack squatrack', smith: 'smith smith_right', rig: 'monsterrack rig', chindip: 'chindip',
  bench: 'bench_flat', benchAdj: 'bench_adj', benchUtil: 'bench_util', benchBar: 'benchpress bench_incline bench_decline', benchDecl: 'ab_decline situp1 situp2',
  roman: 'romanchair', curl: 'curlbench curlbench_adj', tbar: 'tbar', twist: 'twist',
  dbrack: 'dbrack2 dbrack3', platetree: 'platetree', barbell: 'barbellrack fixedbarbell', balls: 'kettlebell medball ballrack',
  platform: 'platform', turf: 'turf', mats: 'stretchzone', sled: 'sled', box: 'plyobox', rope: 'battlerope', sandbag: 'sandbag',
  stretchM: 'stretchmachine', mirrorT: 'mirror_t', mirrorLR: 'mirror_lr', vib: 'vibration', inbody: 'inbody',
  mirror: 'mirror', column: 'column', outlet: 'outlet', logo: 'logo', tv: 'tv_wall tv_stand monitor', speaker: 'speaker_wall speaker_ceil',
  acWall: 'ac_wall', acStand: 'ac_stand purifier', acCeil: 'ac_ceil', light: 'light_ceil', lightLine: 'light_line', lightWall: 'light_wall', clock: 'clock',
  frame: 'frame shelf_wall', desk: 'desk', cabinet: 'cabinet shelf', locker: 'locker', screen: 'screen', plant: 'plant', sofa: 'sofa', fridge: 'showcase fridge',
};
for (const f in FAM) FAM[f].split(' ').forEach(k => { if (CAT[k]) CAT[k].sym = f; });


/* approximate net weight (kg) of a typical commercial model: machines with their weight stack, racks / storage empty, plate-loaded without plates.
   Shown as information only (no floor-load check yet). */
GP.WEIGHTS = {treadmill: 200, treadmill_incline: 270, treadmill_curve: 150, bike: 70, bike_recumbent: 85, bike_spin: 55, bike_air: 60, elliptical: 160, stepmill: 320, rower: 30, skierg: 55, vclimber: 50, airclimber: 120, swimtrainer: 60, chest: 260, chest_incline: 280, shoulder: 260, multipress: 260, pecfly: 230, pecrear: 230, latpull: 230, longpull: 210, latlong: 300, seatedrow: 230, seateddip: 230, assistdip: 250, armcurl: 200, triceps: 200, lateral_seat: 200, lateral_stand: 200, legext: 220, legcurl_seat: 230, legextcurl: 260, legcurl_lying: 220, legpress_seat: 330, totalhip: 230, innerthigh: 200, outerthigh: 200, thighdual: 240, calfsquat: 260, abcrunch: 210, backext: 210, abback: 230, torso: 220, legpress_plate: 350, legpress_linear: 400, hacksquat: 280, hackpress: 300, vsquat: 250, hipthrust: 180, hipthrust_stand: 200, chest_plate: 170, incline_plate: 180, leverage_chest: 190, horiz_bench: 190, pecfly_plate: 200, pectoral_fly: 220, shoulder_plate: 170, viking: 200, smith_shoulder: 250, lateral_plate: 150, bentover_lateral: 160, frontrow: 170, highrow: 180, lowrow: 170, isorow: 180, extremerow: 200, tbar_plate: 90, rotary_pulldown: 180, kneel_curl: 150, abductor_stand: 120, link_abductor: 150, fullbody: 170, crossover: 450, dualpulley: 330, chestweight: 300, multistation: 700, powerrack: 200, halfrack: 150, squatrack: 100, smith: 280, smith_right: 300, multirack: 300, monsterrack: 450, rig: 550, allinone: 400, chindip: 90, bench_flat: 35, bench_adj: 50, bench_util: 40, benchpress: 90, bench_incline: 95, bench_decline: 90, ab_decline: 40, situp1: 30, situp2: 50, romanchair: 45, curlbench: 50, curlbench_adj: 55, tbar: 50, twist: 40, dbrack2: 90, dbrack3: 120, platetree: 45, barbellrack: 60, fixedbarbell: 70, kettlebell: 60, medball: 40, platform: 250, sled: 45, plyobox: 25, battlerope: 15, ballrack: 30, sandbag: 40, stretchmachine: 100, mirror_t: 60, mirror_lr: 50, vibration: 60, inbody: 35};

/* zone sets: [type, x, z, rot] relative to the set center */
GP.SETS = [{id:'set_cardio',name:'유산소 존',desc:'트레드밀 4 · 실내 사이클 2',items:[['treadmill',-2.1,0,0],['treadmill',-0.7,0,0],['treadmill',0.7,0,0],['treadmill',2.1,0,0],['bike',3.35,-0.47,0],['bike',4.15,-0.47,0]]},{id:'set_free',name:'프리웨이트 존',desc:'파워랙 · 조절벤치 2 · 덤벨랙 · 원판 거치대',items:[['powerrack',-1.6,0,0],['dbrack2',1.2,-0.66,0],['bench_adj',0.6,0.9,90],['bench_adj',1.8,0.9,90],['platetree',-1.6,1.8,0]]},{id:'set_machine',name:'상체 머신 존',desc:'체스트 · 숄더 · 랫풀다운 · 시티드 로우',items:[['chest',-2.25,0,0],['shoulder',-0.75,0,0],['latpull',0.75,-0.03,0],['seatedrow',2.25,-0.03,0]]},{id:'set_leg',name:'하체 존',desc:'레그프레스 · 레그 익스텐션 · 레그컬 · 핵스쿼트',items:[['legpress_plate',-2.2,0,0],['legext',-0.6,-0.44,0],['legcurl_seat',0.8,-0.41,0],['hacksquat',2.4,-0.21,0]]},{id:'set_stretch',name:'스트레칭 존',desc:'스트레칭 매트 · 폼롤러 거치대 · 스트레칭 머신',items:[['stretchzone',0,0,0],['ballrack',-1,-1.3,0],['stretchmachine',2.1,0.1,270]]},{id:'set_pt',name:'PT 존',desc:'멀티랙 · 각도조절벤치 · 덤벨랙',items:[['multirack',-0.6,0,0],['bench_adj',1.2,0.6,0],['dbrack2',1.2,-0.72,0]]}];
})();
