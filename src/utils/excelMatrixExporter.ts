import * as XLSX from "xlsx";

interface Location {
  id: string;
  name: string;
}

interface ClassSession {
  id: string;
  name: string;
  locationId: string;
  assignedTeacherId?: string;
}

interface Student {
  id: string;
  name: string;
  classIds: string[];
}

interface Teacher {
  id: string;
  name: string;
  locationId?: string;
}

interface Volunteer {
  id: string;
  name: string;
  locationId: string;
  role?: string;
}

interface StudentAttendanceRecord {
  id: string;
  classId: string;
  date: string;
  checkedInMemberIds: string[];
}

interface VolunteerAttendanceRecord {
  id: string;
  locationId: string;
  date: string;
  checkedInPersonnelIds: string[];
}

export interface ExportMatrixOptions {
  locations: Location[];
  classes: ClassSession[];
  students: Student[];
  teachers: Teacher[];
  volunteers: Volunteer[];
  studentRecords: StudentAttendanceRecord[];
  volunteerRecords: VolunteerAttendanceRecord[];
  targetLocationId?: string;
}

/**
 * Format YYYY-MM-DD or raw date string to "DD MMM YYYY" (e.g., "08 Mar 2026")
 */
function formatDateLabel(rawDate: string): string {
  if (!rawDate) return rawDate;
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return rawDate;

  const day = String(d.getDate()).padStart(2, "0");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Ensure Excel sheet name is valid (<= 31 chars, no invalid chars, unique)
 */
function getUniqueSheetName(prefix: string, locationName: string, usedNames: Set<string>): string {
  const sanitizedLoc = locationName.replace(/[:\\/?*\[\]]/g, "").trim();
  let candidate = `${prefix} - ${sanitizedLoc}`.trim();

  if (candidate.length > 31) {
    candidate = candidate.slice(0, 31).trim();
  }

  let finalName = candidate;
  let counter = 1;
  while (usedNames.has(finalName.toLowerCase())) {
    const suffix = ` (${counter})`;
    const maxLen = 31 - suffix.length;
    finalName = `${candidate.slice(0, maxLen)}${suffix}`;
    counter++;
  }

  usedNames.add(finalName.toLowerCase());
  return finalName;
}

export function exportAttendanceMatrixToExcel({
  locations,
  classes,
  students,
  teachers,
  volunteers,
  studentRecords,
  volunteerRecords,
  targetLocationId = "all",
}: ExportMatrixOptions) {
  const workbook = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();

  // Map class ordering by array position
  const classOrderMap = new Map(classes.map((c, idx) => [c.id, idx]));

  // Determine active locations
  const activeLocations =
    targetLocationId && targetLocationId !== "all"
      ? locations.filter((l) => l.id === targetLocationId)
      : locations.length > 0
      ? locations
      : [{ id: "default", name: "Main Sunday School Campus" }];

  activeLocations.forEach((loc) => {
    // ==========================================
    // 1. TEACHERS & LEADERS MATRIX (SORTED ASCENDING A-Z)
    // ==========================================

    const locTeachers = teachers.filter((t) => t.locationId === loc.id || !t.locationId);
    const locVolunteers = volunteers.filter((v) => v.locationId === loc.id);

    const personnelList: Array<{
      id: string;
      name: string;
      role: string;
      type: "teacher" | "volunteer";
    }> = [];

    locTeachers.forEach((t) => {
      const assignedClassNames = classes
        .filter((c) => c.assignedTeacherId && c.assignedTeacherId.split(",").map(id => id.trim()).includes(t.id))
        .map((c) => c.name)
        .join(", ");

      personnelList.push({
        id: t.id,
        name: t.name,
        role: assignedClassNames || "Teacher",
        type: "teacher",
      });
    });

    locVolunteers.forEach((v) => {
      personnelList.push({
        id: v.id,
        name: v.name,
        role: v.role || "Director / Volunteer",
        type: "volunteer",
      });
    });

    // Sort Teachers & Leaders in Ascending Order (A-Z)
    personnelList.sort((a, b) => a.name.localeCompare(b.name));

    const personnelLocRecords = volunteerRecords.filter((r) => r.locationId === loc.id);
    const personnelDates = [...new Set(personnelLocRecords.map((r) => r.date))].sort();

    if (personnelList.length > 0 || personnelDates.length > 0) {
      const teacherRows: Array<Record<string, string>> = [];

      personnelList.forEach((person) => {
        const row: Record<string, string> = {
          "Teacher / Leader Name": person.name,
          "Class In-charge / Role": person.role,
          "Campus Location": "Main Sunday School Campus",
        };

        let presentCount = 0;
        let conductedCount = 0;

        personnelDates.forEach((rawDate) => {
          const formattedDate = formatDateLabel(rawDate);
          const rec = personnelLocRecords.find((r) => r.date === rawDate);

          if (rec) {
            conductedCount++;
            const isPresent = rec.checkedInPersonnelIds && rec.checkedInPersonnelIds.includes(person.id);
            if (isPresent) {
              row[formattedDate] = "✅";
              presentCount++;
            } else {
              row[formattedDate] = "❌";
            }
          } else {
            row[formattedDate] = "-";
          }
        });

        row["Total Present"] = `${presentCount}/${conductedCount}`;
        teacherRows.push(row);
      });

      if (teacherRows.length === 0) {
        teacherRows.push({
          "Teacher / Leader Name": "No Personnel Registered",
          "Class In-charge / Role": "-",
          "Campus Location": "Main Sunday School Campus",
          "Total Present": "0/0",
        });
      }

      const teacherWs = XLSX.utils.json_to_sheet(teacherRows);
      const tCols = [{ wch: 24 }, { wch: 30 }, { wch: 26 }];
      personnelDates.forEach(() => tCols.push({ wch: 14 }));
      tCols.push({ wch: 14 });
      teacherWs["!cols"] = tCols;

      const sheetName = getUniqueSheetName("Teachers & Staff", loc.name, usedSheetNames);
      XLSX.utils.book_append_sheet(workbook, teacherWs, sheetName);
    }

    // ==========================================
    // 2. ALL STUDENTS MATRIX (ORDERED BY CLASS, THEN SORTED A-Z)
    // ==========================================

    const locClasses = classes.filter((c) => c.locationId === loc.id || loc.id === "default");
    const locClassIds = locClasses.map((c) => c.id);

    // Filter and sort students: First by Class Order, then by Student Name in Ascending Order (A-Z)
    const locStudents = students
      .filter((s) => s.classIds && s.classIds.some((cid) => locClassIds.includes(cid) || locClassIds.length === 0))
      .sort((a, b) => {
        const aClassIdx = a.classIds && a.classIds.length > 0 ? (classOrderMap.get(a.classIds[0]) ?? 999) : 999;
        const bClassIdx = b.classIds && b.classIds.length > 0 ? (classOrderMap.get(b.classIds[0]) ?? 999) : 999;
        if (aClassIdx !== bClassIdx) {
          return aClassIdx - bClassIdx;
        }
        return a.name.localeCompare(b.name);
      });

    const locStudentRecords = studentRecords.filter((r) => locClassIds.includes(r.classId) || locClassIds.length === 0);
    const studentDates = [...new Set(locStudentRecords.map((r) => r.date))].sort();

    if (locStudents.length > 0 || studentDates.length > 0) {
      const studentRows: Array<Record<string, string>> = [];

      locStudents.forEach((student) => {
        const studentClassNames = classes
          .filter((c) => student.classIds && student.classIds.includes(c.id))
          .map((c) => c.name)
          .join(", ");

        const row: Record<string, string> = {
          "Student Name": student.name,
          "Class Cohort": studentClassNames || "Unassigned",
          "Campus Location": "Main Sunday School Campus",
        };

        let presentCount = 0;
        let conductedCount = 0;

        studentDates.forEach((rawDate) => {
          const formattedDate = formatDateLabel(rawDate);
          const studentClassesForLoc = student.classIds;
          const dateRecs = locStudentRecords.filter(
            (r) => r.date === rawDate && studentClassesForLoc.includes(r.classId)
          );

          if (dateRecs.length > 0) {
            conductedCount++;
            const isPresent = dateRecs.some(
              (r) => r.checkedInMemberIds && r.checkedInMemberIds.includes(student.id)
            );
            if (isPresent) {
              row[formattedDate] = "✅";
              presentCount++;
            } else {
              row[formattedDate] = "❌";
            }
          } else {
            row[formattedDate] = "-";
          }
        });

        row["Total Present"] = `${presentCount}/${conductedCount}`;
        studentRows.push(row);
      });

      if (studentRows.length === 0) {
        studentRows.push({
          "Student Name": "No Students Enrolled",
          "Class Cohort": "-",
          "Campus Location": "Main Sunday School Campus",
          "Total Present": "0/0",
        });
      }

      const studentWs = XLSX.utils.json_to_sheet(studentRows);
      const sCols = [{ wch: 24 }, { wch: 30 }, { wch: 26 }];
      studentDates.forEach(() => sCols.push({ wch: 14 }));
      sCols.push({ wch: 14 });
      studentWs["!cols"] = sCols;

      const sheetName = getUniqueSheetName("All Students", loc.name, usedSheetNames);
      XLSX.utils.book_append_sheet(workbook, studentWs, sheetName);
    }

    // ==========================================
    // 3. INDIVIDUAL CLASS TABS (IN CLASS ORDER, STUDENTS SORTED A-Z)
    // ==========================================

    locClasses.forEach((cls) => {
      const classStudents = students
        .filter((s) => s.classIds && s.classIds.includes(cls.id))
        .sort((a, b) => a.name.localeCompare(b.name));

      const classRecs = studentRecords.filter((r) => r.classId === cls.id);
      const classDates = [...new Set(classRecs.map((r) => r.date))].sort();

      const classRows: Array<Record<string, string>> = [];

      classStudents.forEach((student) => {
        const row: Record<string, string> = {
          "Student Name": student.name,
          "Class Cohort": cls.name,
          "Campus Location": "Main Sunday School Campus",
        };

        let presentCount = 0;
        let conductedCount = 0;

        classDates.forEach((rawDate) => {
          const formattedDate = formatDateLabel(rawDate);
          const rec = classRecs.find((r) => r.date === rawDate);

          if (rec) {
            conductedCount++;
            const isPresent = rec.checkedInMemberIds && rec.checkedInMemberIds.includes(student.id);
            if (isPresent) {
              row[formattedDate] = "✅";
              presentCount++;
            } else {
              row[formattedDate] = "❌";
            }
          } else {
            row[formattedDate] = "-";
          }
        });

        row["Total Present"] = `${presentCount}/${conductedCount}`;
        classRows.push(row);
      });

      if (classRows.length > 0) {
        const classWs = XLSX.utils.json_to_sheet(classRows);
        const cCols = [{ wch: 24 }, { wch: 30 }, { wch: 26 }];
        classDates.forEach(() => cCols.push({ wch: 14 }));
        cCols.push({ wch: 14 });
        classWs["!cols"] = cCols;

        const classSheetName = getUniqueSheetName(cls.name, "", usedSheetNames);
        XLSX.utils.book_append_sheet(workbook, classWs, classSheetName);
      }
    });
  });

  // Fallback if no sheets created at all
  if (workbook.SheetNames.length === 0) {
    const defaultWs = XLSX.utils.json_to_sheet([
      { Status: "No attendance markings available for export" },
    ]);
    XLSX.utils.book_append_sheet(workbook, defaultWs, "Attendance Matrix");
  }

  // Trigger download file
  const fileName = `DaAttendance_Matrix_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
