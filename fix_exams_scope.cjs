const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'academics', 'ExamsPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const target1 = `                if (testBooks.length > 0) {
                    const computedStatus = totalPossible > 0 && (totalObtained / totalPossible) * 100 >= 40 ? 'Pass' : 'Fail';
                    const category = filterCategory || CATEGORIES[0];
                    const existing = exams.find((e: any) =>
                        (e.rollNo === rollNo || e.studentName === studentName) &&
                        e.title === testNo &&
                        e.category === category
                    );`;

const rep1 = `                const category = filterCategory || CATEGORIES[0];
                const existing = exams.find((e: any) =>
                    (e.rollNo === rollNo || e.studentName === studentName) &&
                    e.title === testNo &&
                    e.category === category
                );

                if (testBooks.length > 0) {
                    const computedStatus = totalPossible > 0 && (totalObtained / totalPossible) * 100 >= 40 ? 'Pass' : 'Fail';`;

const target2 = `                // Only save if the student has at least one subject filled
                if (studentBooks.length > 0) {
                    const computedStatus = totalPossible > 0 && (totalObtained / totalPossible) * 100 >= 40 ? 'Pass' : 'Fail';
                    const existing = exams.find((e: any) =>
                        e.rollNo === rollNo &&
                        e.title === bulkTestNo &&
                        e.studentClass === studentClassToSave &&
                        e.category === bulkCategory
                    );`;

const rep2 = `                const existing = exams.find((e: any) =>
                    e.rollNo === rollNo &&
                    e.title === bulkTestNo &&
                    e.studentClass === studentClassToSave &&
                    e.category === bulkCategory
                );

                // Only save if the student has at least one subject filled
                if (studentBooks.length > 0) {
                    const computedStatus = totalPossible > 0 && (totalObtained / totalPossible) * 100 >= 40 ? 'Pass' : 'Fail';`;

content = content.replace(target1, rep1);
content = content.replace(target2, rep2);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed scope of existing variable in ExamsPage.tsx');
