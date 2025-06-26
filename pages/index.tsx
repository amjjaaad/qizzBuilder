"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Roboto } from 'next/font/google';
import {
  MdAdd as Plus,
  MdClose as X,
  MdDragIndicator as GripVertical,
  MdImage as Image,
  MdCheck as Check,
  MdChevronLeft as ChevronLeft,
  MdChevronRight as ChevronRight,
  MdSave as Save,
  MdDescription as FileText,
  MdDelete as Trash2,
} from "react-icons/md";

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

interface Question {
  id: string;
  type: "multiple-choice" | "true-false" | "image-based";
  question: string;
  options?: string[];
  correctAnswer: string | number;
  imageUrl?: string;
  characterLimit: number;
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  createdAt: Date;
  updatedAt: Date;
}

const CHARACTER_LIMITS = {
  question: 280,
  option: 100,
  title: 50,
};

export default function QuizBuilder() {
  const [quiz, setQuiz] = useState<Quiz>({
    id: "quiz-" + Date.now(),
    title: "",
    questions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [draggedQuestion, setDraggedQuestion] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">(
    "saved",
  );

  const questionFormRef = useRef<HTMLDivElement>(null);
  const questionListRef = useRef<HTMLDivElement>(null);

  // Auto-save functionality
  useEffect(() => {
    const timer = setTimeout(() => {
      if (saveStatus === "unsaved") {
        setSaveStatus("saving");
        localStorage.setItem("quiz-builder-data", JSON.stringify(quiz));
        setTimeout(() => setSaveStatus("saved"), 500);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [quiz, saveStatus]);

  // Load data on mount
  useEffect(() => {
    const saved = localStorage.getItem("quiz-builder-data");
    if (saved) {
      try {
        const parsedQuiz = JSON.parse(saved);
        setQuiz(parsedQuiz);
      } catch (e) {
        console.error("Failed to load saved quiz:", e);
      }
    }
  }, []);

  const updateQuiz = useCallback((updates: Partial<Quiz>) => {
    setQuiz((prev) => ({ ...prev, ...updates, updatedAt: new Date() }));
    setSaveStatus("unsaved");
  }, []);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: "q-" + Date.now(),
      type: "multiple-choice",
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      characterLimit: CHARACTER_LIMITS.question,
    };

    updateQuiz({
      questions: [...quiz.questions, newQuestion],
    });

    setCurrentQuestionIndex(quiz.questions.length);
    setShowQuestionForm(true);
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const updatedQuestions = [...quiz.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], ...updates };
    updateQuiz({ questions: updatedQuestions });
  };

  const deleteQuestion = (index: number) => {
    const updatedQuestions = quiz.questions.filter((_, i) => i !== index);
    updateQuiz({ questions: updatedQuestions });

    if (currentQuestionIndex >= updatedQuestions.length) {
      setCurrentQuestionIndex(Math.max(0, updatedQuestions.length - 1));
    }
  };

  const reorderQuestions = (fromIndex: number, toIndex: number) => {
    const updatedQuestions = [...quiz.questions];
    const [movedQuestion] = updatedQuestions.splice(fromIndex, 1);
    updatedQuestions.splice(toIndex, 0, movedQuestion);
    updateQuiz({ questions: updatedQuestions });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedQuestion(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedQuestion !== null && draggedQuestion !== dropIndex) {
      reorderQuestions(draggedQuestion, dropIndex);
    }
    setDraggedQuestion(null);
  };

  const QuestionForm = ({
    question,
    index,
  }: {
    question: Question;
    index: number;
  }) => {
    const [localQuestion, setLocalQuestion] = useState(question);

    useEffect(() => {
      setLocalQuestion(question);
    }, [question]);

    const handleUpdate = (updates: Partial<Question>) => {
      const newQuestion = { ...localQuestion, ...updates };
      setLocalQuestion(newQuestion);
      updateQuestion(index, updates);
    };

    const handleQuestionChange = (value: string) => {
      if (value.length <= CHARACTER_LIMITS.question) {
        handleUpdate({ question: value });
      }
    };

    const handleOptionChange = (optIndex: number, value: string) => {
      if (value.length <= CHARACTER_LIMITS.option) {
        const newOptions = [...(localQuestion.options || [])];
        newOptions[optIndex] = value;
        handleUpdate({ options: newOptions });
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Question {index + 1}</h3>
          <button
            onClick={() => deleteQuestion(index)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-full"
          >
            <Trash2 size={20} />
          </button>
        </div>

        {/* Question Type Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Question Type
          </label>
          <select
            value={localQuestion.type}
            onChange={(e) =>
              handleUpdate({
                type: e.target.value as Question["type"],
                options:
                  e.target.value === "multiple-choice"
                    ? ["", "", "", ""]
                    : undefined,
                correctAnswer: e.target.value === "true-false" ? "true" : 0,
              })
            }
            className="w-full p-3 border border-gray-300 rounded-lg text-base"
          >
            <option value="multiple-choice">Multiple Choice</option>
            <option value="true-false">True/False</option>
            <option value="image-based">Image-Based</option>
          </select>
        </div>

        {/* Question Text */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Question ({localQuestion.question.length}/
            {CHARACTER_LIMITS.question})
          </label>
          <textarea
            value={localQuestion.question}
            onChange={(e) => handleQuestionChange(e.target.value)}
            placeholder="Enter your question..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none text-base"
            rows={3}
          />
        </div>

        {/* Image URL for Image-Based Questions */}
        {localQuestion.type === "image-based" && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Image URL</label>
            <input
              type="url"
              value={localQuestion.imageUrl || ""}
              onChange={(e) => handleUpdate({ imageUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className="w-full p-3 border border-gray-300 rounded-lg text-base"
            />
            {localQuestion.imageUrl && (
              <div className="mt-2">
                <img
                  src={localQuestion.imageUrl}
                  alt="Question"
                  className="max-w-full h-48 object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Options for Multiple Choice */}
        {localQuestion.type === "multiple-choice" && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Options</label>
            {localQuestion.options?.map((option, optIndex) => (
              <div key={optIndex} className="flex items-center mb-2">
                <input
                  type="radio"
                  name={`correct-${index}`}
                  checked={localQuestion.correctAnswer === optIndex}
                  onChange={() => handleUpdate({ correctAnswer: optIndex })}
                  className="mr-2"
                />
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(optIndex, e.target.value)}
                  placeholder={`Option ${optIndex + 1}`}
                  className="flex-1 p-2 border border-gray-300 rounded text-base"
                />
                <span className="ml-2 text-xs text-gray-500">
                  {option.length}/{CHARACTER_LIMITS.option}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* True/False Options */}
        {localQuestion.type === "true-false" && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Correct Answer
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name={`tf-${index}`}
                  value="true"
                  checked={localQuestion.correctAnswer === "true"}
                  onChange={() => handleUpdate({ correctAnswer: "true" })}
                  className="mr-2"
                />
                True
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name={`tf-${index}`}
                  value="false"
                  checked={localQuestion.correctAnswer === "false"}
                  onChange={() => handleUpdate({ correctAnswer: "false" })}
                  className="mr-2"
                />
                False
              </label>
            </div>
          </div>
        )}

        {/* Image-Based Correct Answer */}
        {localQuestion.type === "image-based" && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Correct Answer
            </label>
            <input
              type="text"
              value={localQuestion.correctAnswer as string}
              onChange={(e) => handleUpdate({ correctAnswer: e.target.value })}
              placeholder="Enter the correct answer"
              className="w-full p-3 border border-gray-300 rounded-lg text-base"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${roboto.className}`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <input
                type="text"
                value={quiz.title}
                onChange={(e) => {
                  if (e.target.value.length <= CHARACTER_LIMITS.title) {
                    updateQuiz({ title: e.target.value });
                  }
                }}
                placeholder="Quiz Title"
                className="text-lg font-semibold bg-transparent border-none outline-none w-full"
              />
              <div className="text-xs text-gray-500">
                {quiz.title.length}/{CHARACTER_LIMITS.title} •{" "}
                {quiz.questions.length} questions
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`text-xs px-2 py-1 rounded-full ${
                  saveStatus === "saved"
                    ? "bg-green-100 text-green-700"
                    : saveStatus === "saving"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {saveStatus === "saved"
                  ? "Saved"
                  : saveStatus === "saving"
                    ? "Saving..."
                    : "Unsaved"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question List */}
      {!showQuestionForm && (
        <div className="p-4">
          <div ref={questionListRef} className="space-y-3 pb-20">
            {quiz.questions.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No questions yet
                </h3>
                <p className="text-gray-500 mb-4">
                  Tap the + button to add your first question
                </p>
              </div>
            ) : (
              quiz.questions.map((question, index) => (
                <div
                  key={question.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onClick={() => {
                    setCurrentQuestionIndex(index);
                    setShowQuestionForm(true);
                  }}
                  className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer active:scale-95 transition-transform ${
                    draggedQuestion === index ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="cursor-grab active:cursor-grabbing p-1">
                      <GripVertical size={16} className="text-gray-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-blue-600">
                          Q{index + 1}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            question.type === "multiple-choice"
                              ? "bg-blue-100 text-blue-700"
                              : question.type === "true-false"
                                ? "bg-green-100 text-green-700"
                                : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {question.type === "multiple-choice"
                            ? "Multiple Choice"
                            : question.type === "true-false"
                              ? "True/False"
                              : "Image-Based"}
                        </span>
                      </div>

                      <p className="text-gray-900 text-sm leading-relaxed truncate">
                        {question.question || "Untitled question"}
                      </p>

                      {question.type === "multiple-choice" &&
                        question.options && (
                          <div className="mt-2 text-xs text-gray-500">
                            {
                              question.options.filter((opt) => opt.trim())
                                .length
                            }{" "}
                            options
                          </div>
                        )}

                      {question.type === "image-based" && question.imageUrl && (
                        <div className="mt-2">
                          <Image size={16} className="text-gray-400" />
                        </div>
                      )}
                    </div>

                    <ChevronRight
                      size={16}
                      className="text-gray-400 flex-shrink-0"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Question Form */}
      {showQuestionForm && quiz.questions[currentQuestionIndex] && (
        <div className="p-4 pb-20">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowQuestionForm(false)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="text-sm text-gray-500">
              {currentQuestionIndex + 1} of {quiz.questions.length}
            </div>
            <div className="w-10" />
          </div>

          <div ref={questionFormRef}>
            <QuestionForm
              question={quiz.questions[currentQuestionIndex]}
              index={currentQuestionIndex}
            />
          </div>

          {/* Navigation between questions */}
          {quiz.questions.length > 1 && (
            <div className="flex justify-between mt-4">
              <button
                onClick={() => {
                  if (currentQuestionIndex > 0) {
                    setCurrentQuestionIndex(currentQuestionIndex - 1);
                  }
                }}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => {
                  if (currentQuestionIndex < quiz.questions.length - 1) {
                    setCurrentQuestionIndex(currentQuestionIndex + 1);
                  } else {
                    setShowQuestionForm(false);
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg"
              >
                {currentQuestionIndex === quiz.questions.length - 1
                  ? "Done"
                  : "Next"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Add Button */}
      <button
        onClick={addQuestion}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 active:scale-95 transition-all z-50 flex items-center justify-center"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
