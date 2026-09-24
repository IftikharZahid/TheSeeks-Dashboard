const fs = require('fs');
const file = 'src/pages/people/TeachersPage.tsx';
let c = fs.readFileSync(file, 'utf8');

// 1. Fix openEdit to filter by subjectsList
c = c.replace(
  "const openEdit = (t: Teacher) => { const subjectsArr = t.subjects && t.subjects.length > 0 ? t.subjects : (t.subject ? t.subject.split(',').map((s: string) => s.trim()).filter(Boolean) : []); setEditing(t); setForm({ ...t, subjects: subjectsArr }); setModalOpen(true); };",
  "const openEdit = (t: Teacher) => { let subjectsArr = t.subjects && t.subjects.length > 0 ? t.subjects : (t.subject ? t.subject.split(',').map((s: string) => s.trim()).filter(Boolean) : []); subjectsArr = subjectsArr.filter((s: string) => subjectsList.includes(s)); setEditing(t); setForm({ ...t, subjects: subjectsArr }); setModalOpen(true); };"
);

// 2. Fix the display in the Table
c = c.replace(
  "{(t.subjects && t.subjects.length > 0 ? t.subjects : (t.subject ? t.subject.split(',').map((s: string) => s.trim()).filter(Boolean) : [])).map((s: string, idx: number) => (",
  "{(t.subjects && t.subjects.length > 0 ? t.subjects : (t.subject ? t.subject.split(',').map((s: string) => s.trim()).filter(Boolean) : [])).filter((s: string) => subjectsList.includes(s)).map((s: string, idx: number) => ("
);

// 3. Fix the display in the View Modal (Chips)
c = c.replace(
  "{(viewTeacher.subjects && viewTeacher.subjects.length > 0 ? viewTeacher.subjects : (viewTeacher.subject ? viewTeacher.subject.split(',').map((s: string) => s.trim()).filter(Boolean) : [])).map((s: string, idx: number) => (",
  "{(viewTeacher.subjects && viewTeacher.subjects.length > 0 ? viewTeacher.subjects : (viewTeacher.subject ? viewTeacher.subject.split(',').map((s: string) => s.trim()).filter(Boolean) : [])).filter((s: string) => subjectsList.includes(s)).map((s: string, idx: number) => ("
);

// 4. Fix the display in the View Modal (Text Table)
c = c.replace(
  "['Subject',     (viewTeacher.subjects && viewTeacher.subjects.length > 0 ? viewTeacher.subjects.join(', ') : (viewTeacher.subject ? viewTeacher.subject.split(',').map((s: string) => s.trim()).filter(Boolean).join(', ') : '—'))],",
  "['Subject',     (viewTeacher.subjects && viewTeacher.subjects.length > 0 ? viewTeacher.subjects.filter((s: string) => subjectsList.includes(s)).join(', ') : (viewTeacher.subject ? viewTeacher.subject.split(',').map((s: string) => s.trim()).filter(Boolean).filter((s: string) => subjectsList.includes(s)).join(', ') : '—'))],"
);

fs.writeFileSync(file, c);
console.log('Fixed dummy subjects mapping');
