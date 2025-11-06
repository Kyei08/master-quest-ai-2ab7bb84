import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Question {
  question: string;
  type: "mcq" | "true_false" | "short_answer" | "case_study" | "essay";
  options?: string[];
  marks: number;
  sectionTitle?: string;
}

interface QuizQuestionProps {
  question: Question;
  questionIndex: number;
  answer?: number | string;
  onAnswerChange: (value: number | string) => void;
}

export const QuizQuestion = ({ 
  question, 
  questionIndex, 
  answer, 
  onAnswerChange 
}: QuizQuestionProps) => {
  const isMCQ = question.type === "mcq" || question.type === "true_false";
  const isWritten = question.type === "short_answer" || question.type === "case_study" || question.type === "essay";

  return (
    <div className="p-4 sm:p-6 bg-muted/50 rounded-lg border-l-4 border-primary">
      {question.sectionTitle && (
        <div className="mb-4">
          <Badge variant="secondary" className="text-xs sm:text-sm font-semibold">
            {question.sectionTitle}
          </Badge>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
        <h4 className="font-medium flex-1 text-sm sm:text-base break-words">
          {questionIndex + 1}. {question.question}
        </h4>
        <Badge variant="outline" className="self-start text-xs">
          {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
        </Badge>
      </div>

      {isMCQ && question.options && (
        <RadioGroup
          value={answer?.toString()}
          onValueChange={(value) => onAnswerChange(parseInt(value))}
          className="space-y-3"
        >
          {question.options.map((option, oIndex) => (
            <div key={oIndex} className="flex items-start space-x-3 py-2 touch-manipulation">
              <RadioGroupItem 
                value={oIndex.toString()} 
                id={`q${questionIndex}-o${oIndex}`}
                className="mt-0.5 shrink-0"
              />
              <Label 
                htmlFor={`q${questionIndex}-o${oIndex}`} 
                className="cursor-pointer text-sm sm:text-base break-words leading-relaxed"
              >
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {isWritten && (
        <textarea
          className="w-full p-3 mt-2 border rounded-md bg-background min-h-[150px] sm:min-h-[120px] focus:outline-none focus:ring-2 focus:ring-ring text-sm sm:text-base"
          placeholder={
            question.type === "essay" 
              ? "Write your detailed answer here (minimum 150 words recommended)..." 
              : "Type your answer here..."
          }
          value={answer as string || ""}
          onChange={(e) => onAnswerChange(e.target.value)}
        />
      )}
    </div>
  );
};
