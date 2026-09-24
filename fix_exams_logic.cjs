const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'academics', 'ExamsPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `                const category = filterCategory || CATEGORIES[0];
                const existing = exams.find((e: any) =>
                    (e.rollNo === rollNo || e.studentName === studentName) &&
                    e.title === testNo &&
                    e.category === category
                );

                if (testBooks.length > 0) {
                    const computedStatus = totalPossible > 0 && (totalObtained / totalPossible) * 100 >= 40 ? 'Pass' : 'Fail';
                    // Stable unique docId — no Date.now() collision
                    const docId = existing
                        ? existing.id
                        : \`\${category}_\${studentClass}_\${testNo}_\${rollNo}\`.replace(/\\s+/g, '_');

                    const formattedDate = existing?.date || format(new Date(), 'dd MMM yyyy');
                    const examData = {
                        id: docId,
                        title: testNo,
                        date: formattedDate,
                        category: category,
                        rollNo,
                        studentName,
                        studentEmail: (studentEmail || '').toLowerCase(),
                        studentClass,
                        books: sortBooksSequence(testBooks),
                        totalMarks: totalPossible.toString(),
                        obtainedMarks: totalObtained.toString(),
                        status: computedStatus,
                        description: existing?.description || 'Details Uploaded Record',
                    };

                    // Optimistic update + Network Sync via RTK Thunk
                    dispatch(saveExam(examData as any));
                    updateCount++;
                } else if (existing) {
                    dispatch(deleteExam(existing.id));
                    updateCount++;
                }`;

const replacementStr = `                const existingAll = exams.filter((e: any) =>
                    (e.rollNo === rollNo || e.studentName === studentName) &&
                    e.title === testNo &&
                    (filterCategory ? e.category === filterCategory : true)
                );
                const existing = existingAll[0];
                const category = existing ? existing.category : (filterCategory || CATEGORIES[0]);

                if (testBooks.length > 0) {
                    const computedStatus = totalPossible > 0 && (totalObtained / totalPossible) * 100 >= 40 ? 'Pass' : 'Fail';
                    const docId = existing
                        ? existing.id
                        : \`\${category}_\${studentClass}_\${testNo}_\${rollNo}\`.replace(/\\s+/g, '_');

                    const formattedDate = existing?.date || format(new Date(), 'dd MMM yyyy');
                    const examData = {
                        id: docId,
                        title: testNo,
                        date: formattedDate,
                        category: category,
                        rollNo,
                        studentName,
                        studentEmail: (studentEmail || '').toLowerCase(),
                        studentClass,
                        books: sortBooksSequence(testBooks),
                        totalMarks: totalPossible.toString(),
                        obtainedMarks: totalObtained.toString(),
                        status: computedStatus,
                        description: existing?.description || 'Details Uploaded Record',
                    };

                    dispatch(saveExam(examData as any));
                    updateCount++;

                    // Clean up any duplicates that might have caused ghost subjects
                    for (let i = 1; i < existingAll.length; i++) {
                        dispatch(deleteExam(existingAll[i].id));
                    }
                } else if (existingAll.length > 0) {
                    // Completely empty test, remove all related records
                    existingAll.forEach((ex: any) => {
                        dispatch(deleteExam(ex.id));
                    });
                    updateCount++;
                }`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed ExamsPage logic with existingAll');
