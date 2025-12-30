export interface Option {
  id: string;
  option_text: string;
  is_correct: boolean;
}

export interface Question {
  id: string;
  question_text: string;
  options: Option[];
}

export interface Quiz {
  id: string;
  title: string;
  lesson_id: string;
  questions: Question[];
}



