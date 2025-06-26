
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Roboto } from 'next/font/google';
import { motion, useTransform, useMotionValue, Reorder } from "framer-motion";
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
  MdEdit as Edit,
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
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">(
    "saved",
  );
  const [previewMode, setPreviewMode] = useState<{ [key: string]: boolean }>({});
  const [dragMode, setDragMode] = useState<{ [key: string]: boolean }>({});

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

  const reorderQuestions = (newOrder: Question[]) => {
    updateQuiz({ questions: newOrder });
  };

  const togglePreview = (questionId: string) => {
    setPreviewMode(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const SwipeableQuestionCard = ({ question, index }: { question: Question; index: number }) => {
    const x = useMotionValue(0);
    const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
    const [isPressed, setIsPressed] = useState(false);
    
    const background = useTransform(
      x,
      [-100, -50, 0, 50, 100],
      ["#ef4444", "#ef4444", "#ffffff", "#3b82f6", "#3b82f6"]
    );
    const editOpacity = useTransform(x, [0, 50, 100], [0, 0.5, 1]);
    const deleteOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);

    const isDragModeActive = dragMode[question.id];

    const handlePressStart = () => {
      setIsPressed(true);
      const timer = setTimeout(() => {
        setDragMode(prev => ({ ...prev, [question.id]: true }));
        setIsPressed(false);
      }, 500); // 500ms press-and-hold
      setPressTimer(timer);
    };

    const handlePressEnd = () => {
      setIsPressed(false);
      if (pressTimer) {
        clearTimeout(pressTimer);
        setPressTimer(null);
      }
    };

    const handleDragEnd = (event: any, info: any) => {
      if (isDragModeActive) {
        // In drag mode, only handle reordering (handled by Reorder.Item)
        setDragMode(prev => ({ ...prev, [question.id]: false }));
        return;
      }

      // In swipe mode, handle swipe gestures
      const offset = info.offset.x;
      const velocity = info.velocity.x;
      
      // Swipe right to edit (threshold: 60px or velocity > 500)
      if (offset > 60 || velocity > 500) {
        setCurrentQuestionIndex(index);
        setShowQuestionForm(true);
      }
      // Swipe left to delete (threshold: -60px or velocity < -500)
      else if (offset < -60 || velocity < -500) {
        deleteQuestion(index);
      }
      
      // Reset position
      x.set(0);
    };

    return (
      <div className="relative overflow-hidden rounded-xl">
        {/* Background indicators - only show when not in drag mode */}
        {!isDragModeActive && (
          <motion.div 
            style={{ backgroundColor: background }}
            className="absolute inset-0 flex items-center justify-between px-6"
          >
            <motion.div 
              style={{ opacity: deleteOpacity }}
              className="flex items-center text-white font-semibold"
            >
              <Trash2 size={20} className="mr-2" />
              Delete
            </motion.div>
            <motion.div 
              style={{ opacity: editOpacity }}
              className="flex items-center text-white font-semibold"
            >
              Edit
              <Edit size={20} className="ml-2" />
            </motion.div>
          </motion.div>
        )}

        {/* Main card content */}
        <motion.div
          drag={isDragModeActive ? "y" : "x"}
          dragConstraints={isDragModeActive ? { top: 0, bottom: 0 } : { left: -120, right: 120 }}
          dragElastic={isDragModeActive ? 0 : 0.1}
          style={{ x: isDragModeActive ? 0 : x }}
          onDragEnd={handleDragEnd}
          onPointerDown={handlePressStart}
          onPointerUp={handlePressEnd}
          onPointerLeave={handlePressEnd}
          className={`relative z-10 rounded-xl p-5 border-2 transition-all duration-200 ${
            isDragModeActive 
              ? "bg-blue-50 border-blue-300 shadow-lg scale-105" 
              : isPressed
                ? "bg-gray-100 border-gray-300 scale-95"
                : "bg-gray-50 border-transparent hover:border-blue-200 transform hover:scale-[1.02] hover:shadow-md"
          } ${
            isDragModeActive ? "cursor-grabbing" : "cursor-grab active:cursor-grabbing"
          }`}
          whileDrag={isDragModeActive ? { 
            scale: 1.05,
            zIndex: 999,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
          } : {}}
        >
          {/* Drag mode indicator */}
          {isDragModeActive && (
            <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              Drag Mode
            </div>
          )}

          {/* Press and hold indicator */}
          {isPressed && !isDragModeActive && (
            <div className="absolute top-2 right-2 bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              Hold to Drag
            </div>
          )}

          <div className="flex items-start space-x-4">
            <div className={`flex-shrink-0 p-2 transition-colors ${
              isDragModeActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
            }`}>
              <GripVertical size={16} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-semibold text-gray-900">Question {index + 1}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full transition-colors ${
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
                {!isDragModeActive && (
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-full hover:bg-blue-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePreview(question.id);
                      }}
                      title="Preview"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button 
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-full hover:bg-blue-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentQuestionIndex(index);
                        setShowQuestionForm(true);
                      }}
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button 
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-full hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteQuestion(index);
                      }}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="mb-3">
                <p className="text-gray-800 font-medium mb-2 line-clamp-2">
                  {question.question || "Untitled question"}
                </p>
                {question.type === "image-based" && question.imageUrl && (
                  <div className="mb-3">
                    <img 
                      src={question.imageUrl} 
                      alt="Question illustration" 
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  <span>{question.question.length}</span>/{CHARACTER_LIMITS.question} characters
                </div>
              </div>
              
              {question.type === "multiple-choice" && question.options && (
                <div className="text-sm text-gray-500">
                  {question.options.filter((opt) => opt.trim()).length} options • 
                  Correct: Option {(question.correctAnswer as number) + 1}
                </div>
              )}
              
              {question.type === "true-false" && (
                <div className="text-sm text-gray-500">
                  Correct answer: <span className="capitalize">{question.correctAnswer as string}</span>
                </div>
              )}
              
              {question.type === "image-based" && (
                <div className="text-sm text-gray-500">
                  Answer: {question.correctAnswer as string}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
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

  const QuestionPreview = ({ question, index }: { question: Question; index: number }) => {
    return (
      <div className="bg-white rounded-lg border-2 border-blue-200 p-6 shadow-lg">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-semibold text-gray-900">Question {index + 1}</span>
            <span className="text-sm text-gray-500">Preview Mode</span>
          </div>
          <h3 className="text-xl font-medium text-gray-800 mb-4">{question.question}</h3>
          
          {question.type === "image-based" && question.imageUrl && (
            <div className="mb-4">
              <img
                src={question.imageUrl}
                alt="Question"
                className="w-full h-48 object-cover rounded-lg border border-gray-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>

        {question.type === "multiple-choice" && question.options && (
          <div className="space-y-3">
            {question.options.map((option, optIndex) => (
              option.trim() && (
                <div
                  key={optIndex}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-blue-300 ${
                    question.correctAnswer === optIndex
                      ? "border-green-400 bg-green-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                      question.correctAnswer === optIndex
                        ? "border-green-500 bg-green-500"
                        : "border-gray-300"
                    }`}>
                      {question.correctAnswer === optIndex && (
                        <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                      )}
                    </div>
                    <span className="text-gray-800">{option}</span>
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {question.type === "true-false" && (
          <div className="space-y-3">
            {["true", "false"].map((option) => (
              <div
                key={option}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-blue-300 ${
                  question.correctAnswer === option
                    ? "border-green-400 bg-green-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    question.correctAnswer === option
                      ? "border-green-500 bg-green-500"
                      : "border-gray-300"
                  }`}>
                    {question.correctAnswer === option && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                  <span className="text-gray-800 capitalize">{option}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {question.type === "image-based" && (
          <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Correct Answer:</p>
            <p className="text-gray-800 font-medium">{question.correctAnswer}</p>
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
          <div ref={questionListRef} className="pb-20">
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
              <Reorder.Group
                axis="y"
                values={quiz.questions}
                onReorder={reorderQuestions}
                className="space-y-3"
              >
                {quiz.questions.map((question, index) => (
                  <Reorder.Item 
                    key={question.id} 
                    value={question}
                    className="group"
                    drag={dragMode[question.id]}
                  >
                    {previewMode[question.id] ? (
                      <div className="animate-in slide-in-from-bottom-4 duration-300">
                        <QuestionPreview question={question} index={index} />
                        <div className="flex items-center justify-between mt-3 px-2">
                          <button
                            onClick={() => togglePreview(question.id)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Exit Preview
                          </button>
                          <button
                            onClick={() => {
                              setCurrentQuestionIndex(index);
                              setShowQuestionForm(true);
                            }}
                            className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                          >
                            Edit Question
                          </button>
                        </div>
                      </div>
                    ) : (
                      <SwipeableQuestionCard question={question} index={index} />
                    )}
                  </Reorder.Item>
                ))}
              </Reorder.Group>
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
