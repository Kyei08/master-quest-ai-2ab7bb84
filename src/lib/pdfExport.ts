import jsPDF from 'jspdf';

interface AssignmentSection {
  id: number;
  title: string;
  marks: number;
  description: string;
  tasks: Array<{
    id: string;
    question: string;
    marks: number;
    type: string;
  }>;
}

interface QuizQuestion {
  question: string;
  type: string;
  options?: string[];
  marks: number;
  section?: string;
}

export const exportAssignmentToPDF = (
  moduleTopic: string,
  sections: AssignmentSection[],
  answers?: Record<string, string>
) => {
  const doc = new jsPDF();
  let yPosition = 20;
  const pageHeight = doc.internal.pageSize.height;
  const marginBottom = 20;

  // Title
  doc.setFontSize(18);
  doc.text(`Assignment: ${moduleTopic}`, 20, yPosition);
  yPosition += 15;

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition);
  yPosition += 15;

  sections.forEach((section) => {
    // Check if we need a new page
    if (yPosition > pageHeight - marginBottom) {
      doc.addPage();
      yPosition = 20;
    }

    // Section title
    doc.setFontSize(14);
    doc.text(`${section.title} (${section.marks} Marks)`, 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    const descLines = doc.splitTextToSize(section.description, 170);
    doc.text(descLines, 20, yPosition);
    yPosition += descLines.length * 6 + 5;

    section.tasks.forEach((task) => {
      if (yPosition > pageHeight - marginBottom) {
        doc.addPage();
        yPosition = 20;
      }

      // Task question
      doc.setFontSize(11);
      const questionLines = doc.splitTextToSize(
        `${task.id}. ${task.question} (${task.marks} Marks)`,
        170
      );
      doc.text(questionLines, 25, yPosition);
      yPosition += questionLines.length * 6 + 5;

      // Answer if available
      if (answers && answers[task.id]) {
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 150);
        doc.text('Answer:', 25, yPosition);
        yPosition += 6;
        
        const answerLines = doc.splitTextToSize(answers[task.id], 165);
        doc.text(answerLines, 25, yPosition);
        yPosition += answerLines.length * 6 + 8;
        doc.setTextColor(0, 0, 0);
      } else {
        yPosition += 15; // Space for answer
      }
    });

    yPosition += 5;
  });

  doc.save(`assignment-${moduleTopic.replace(/\s+/g, '-')}.pdf`);
};

export const exportQuizToPDF = (
  moduleTopic: string,
  quizType: string,
  questions: QuizQuestion[],
  answers?: Record<number, string | number>,
  score?: number
) => {
  const doc = new jsPDF();
  let yPosition = 20;
  const pageHeight = doc.internal.pageSize.height;
  const marginBottom = 20;

  // Title
  doc.setFontSize(18);
  const title = quizType === 'final_test' ? 'Final Test' : 'Practice Quiz';
  doc.text(`${title}: ${moduleTopic}`, 20, yPosition);
  yPosition += 15;

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition);
  yPosition += 10;

  if (score !== undefined) {
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    doc.text(`Score: ${score}/${totalMarks}`, 20, yPosition);
    yPosition += 15;
  } else {
    yPosition += 10;
  }

  questions.forEach((question, index) => {
    if (yPosition > pageHeight - marginBottom) {
      doc.addPage();
      yPosition = 20;
    }

    // Section header if present
    if (question.section && (index === 0 || questions[index - 1].section !== question.section)) {
      doc.setFontSize(12);
      doc.text(question.section, 20, yPosition);
      yPosition += 10;
    }

    // Question
    doc.setFontSize(11);
    const questionLines = doc.splitTextToSize(
      `${index + 1}. ${question.question} (${question.marks} Marks)`,
      170
    );
    doc.text(questionLines, 25, yPosition);
    yPosition += questionLines.length * 6 + 5;

    // Options for MCQ
    if (question.options && question.options.length > 0) {
      doc.setFontSize(10);
      question.options.forEach((option) => {
        if (yPosition > pageHeight - marginBottom) {
          doc.addPage();
          yPosition = 20;
        }
        const optionLines = doc.splitTextToSize(option, 160);
        doc.text(optionLines, 30, yPosition);
        yPosition += optionLines.length * 6 + 2;
      });
      yPosition += 3;
    }

    // Answer if available
    if (answers && answers[index] !== undefined) {
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 150);
      doc.text('Your Answer:', 25, yPosition);
      yPosition += 6;
      
      const answerText = String(answers[index]);
      const answerLines = doc.splitTextToSize(answerText, 165);
      doc.text(answerLines, 25, yPosition);
      yPosition += answerLines.length * 6 + 8;
      doc.setTextColor(0, 0, 0);
    } else {
      yPosition += 10;
    }

    yPosition += 5;
  });

  const filename = `${quizType === 'final_test' ? 'final-test' : 'quiz'}-${moduleTopic.replace(/\s+/g, '-')}.pdf`;
  doc.save(filename);
};
