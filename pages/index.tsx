
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Roboto } from "next/font/google";
import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
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
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );
  const [showQuestionTypes, setShowQuestionTypes] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  // Close question types when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showQuestionTypes && !(event.target as Element).closest('.floating-add-container')) {
        setShowQuestionTypes(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showQuestionTypes]);

  const updateQuiz = useCallback((updates: Partial<Quiz>) => {
    setQuiz((prev) => ({ ...prev, ...updates, updatedAt: new Date() }));
    setSaveStatus("unsaved");
  }, []);

  const addQuestion = (questionType: Question["type"] = "multiple-choice") => {
    const newQuestion: Question = {
      id: "q-" + Date.now(),
      type: questionType,
      question: "",
      options: questionType === "multiple-choice" ? ["", "", "", ""] : undefined,
      correctAnswer: 
        questionType === "true-false" 
          ? "true" 
          : questionType === "multiple-choice" 
            ? 0 
            : "",
      characterLimit: CHARACTER_LIMITS.question,
    };

    updateQuiz({
      questions: [...quiz.questions, newQuestion],
    });

    setCurrentQuestionIndex(quiz.questions.length);
    setShowQuestionForm(true);
    setShowQuestionTypes(false);
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const updatedQuestions = [...quiz.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], ...updates };
    updateQuiz({ questions: updatedQuestions });
  };

  const deleteQuestion = (questionId: string) => {
    const updatedQuestions = quiz.questions.filter((q) => q.id !== questionId);
    updateQuiz({ questions: updatedQuestions });
    setShowDeleteConfirm(null);
  };

  const reorderQuestions = (fromIndex: number, toIndex: number) => {
    const updatedQuestions = [...quiz.questions];
    const [movedQuestion] = updatedQuestions.splice(fromIndex, 1);
    updatedQuestions.splice(toIndex, 0, movedQuestion);
    updateQuiz({ questions: updatedQuestions });
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
            onClick={() => deleteQuestion(localQuestion.id)}
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

  const StudentQuestionCard = ({
    question,
    index,
  }: {
    question: Question;
    index: number;
  }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    
    const [isDragging, setIsDragging] = useState(false);
    const [dragDirection, setDragDirection] = useState<'horizontal' | 'vertical' | null>(null);

    const handleDragStart = () => {
      setIsDragging(true);
      setDraggedIndex(index);
    };

    const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const deltaX = Math.abs(info.delta.x);
      const deltaY = Math.abs(info.delta.y);
      
      // Determine drag direction based on initial movement
      if (!dragDirection && (deltaX > 10 || deltaY > 10)) {
        if (deltaX > deltaY * 1.5) {
          setDragDirection('horizontal');
        } else if (deltaY > deltaX * 1.5) {
          setDragDirection('vertical');
        }
      }

      // Handle vertical dragging for reordering
      if (dragDirection === 'vertical') {
        const currentY = y.get();
        const cardHeight = 140; // Approximate card height
        const newIndex = Math.round(index + currentY / cardHeight);
        const clampedIndex = Math.max(0, Math.min(quiz.questions.length - 1, newIndex));
        
        if (clampedIndex !== dragOverIndex) {
          setDragOverIndex(clampedIndex);
        }
      }
    };

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const deltaX = info.offset.x;
      const deltaY = info.offset.y;
      const velocityX = info.velocity.x;
      const velocityY = info.velocity.y;

      if (dragDirection === 'horizontal') {
        // Handle horizontal swipe actions
        const threshold = 80;
        const velocityThreshold = 300;
        
        if (deltaX > threshold || velocityX > velocityThreshold) {
          // Swipe right - Edit
          setCurrentQuestionIndex(index);
          setShowQuestionForm(true);
        } else if (deltaX < -threshold || velocityX < -velocityThreshold) {
          // Swipe left - Delete
          setShowDeleteConfirm(question.id);
        }
      } else if (dragDirection === 'vertical' && dragOverIndex !== null && dragOverIndex !== index) {
        // Handle vertical drag for reordering
        reorderQuestions(index, dragOverIndex);
      }

      // Reset values
      x.set(0);
      y.set(0);
      setDragDirection(null);
      setDragOverIndex(null);
      setIsDragging(false);
      setDraggedIndex(null);
    };

    const cardVariants = {
      idle: {
        scale: 1,
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      },
      dragging: {
        scale: 1.02,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        zIndex: 50,
      },
    };

    return (
      <motion.div
        className="relative mb-4"
        initial={false}
        animate={isDragging ? "dragging" : "idle"}
        variants={cardVariants}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Drop indicator for vertical reordering */}
        {dragOverIndex === index && draggedIndex !== index && (
          <motion.div
            className="absolute -top-2 left-0 right-0 h-1 bg-blue-500 rounded-full z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          />
        )}

        <motion.div
          className="bg-white rounded-xl border border-gray-200 cursor-grab active:cursor-grabbing overflow-hidden relative"
          style={{ 
            x: dragDirection === 'horizontal' ? x : 0, 
            y: dragDirection === 'vertical' ? y : 0 
          }}
          drag={dragDirection || true}
          dragConstraints={dragDirection === 'horizontal' ? { left: -150, right: 150, top: 0, bottom: 0 } : { left: 0, right: 0, top: -200, bottom: 200 }}
          dragElastic={0.1}
          dragMomentum={false}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          whileDrag={{ cursor: "grabbing" }}
        >
          {/* Swipe action indicators */}
          <motion.div
            className="absolute inset-y-0 left-0 w-20 bg-blue-500 flex items-center justify-center z-0"
            style={{ 
              opacity: dragDirection === 'horizontal' && x.get() > 40 ? 1 : 0 
            }}
          >
            <Edit size={24} className="text-white" />
          </motion.div>
          
          <motion.div
            className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center z-0"
            style={{ 
              opacity: dragDirection === 'horizontal' && x.get() < -40 ? 1 : 0 
            }}
          >
            <Trash2 size={24} className="text-white" />
          </motion.div>

          <div className="p-6 relative bg-white">
            {/* Question header with drag handle */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <motion.div 
                  className="cursor-grab active:cursor-grabbing"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <GripVertical size={20} className="text-gray-400" />
                </motion.div>
                <span className="text-lg font-semibold text-gray-900">
                  Question {index + 1}
                </span>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-medium ${
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
            </div>

            {/* Question text */}
            <div className="mb-6">
              <h3 className="text-xl font-medium text-gray-800 leading-relaxed">
                {question.question || "Untitled question"}
              </h3>
            </div>

            {/* Image for image-based questions */}
            {question.type === "image-based" && question.imageUrl && (
              <div className="mb-6">
                <img
                  src={question.imageUrl}
                  alt="Question illustration"
                  className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}

            {/* Answer options */}
            {question.type === "multiple-choice" && question.options && (
              <div className="space-y-3">
                {question.options.map(
                  (option, optIndex) =>
                    option.trim() && (
                      <motion.div
                        key={optIndex}
                        className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center">
                          <div className="w-5 h-5 rounded-full border-2 border-gray-400 mr-4 flex-shrink-0">
                            <div className="w-full h-full rounded-full"></div>
                          </div>
                          <span className="text-gray-800 text-lg">
                            {option}
                          </span>
                        </div>
                      </motion.div>
                    ),
                )}
              </div>
            )}

            {question.type === "true-false" && (
              <div className="space-y-3">
                {["True", "False"].map((option) => (
                  <motion.div
                    key={option}
                    className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center">
                      <div className="w-5 h-5 rounded-full border-2 border-gray-400 mr-4 flex-shrink-0">
                        <div className="w-full h-full rounded-full"></div>
                      </div>
                      <span className="text-gray-800 text-lg">{option}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {question.type === "image-based" && (
              <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Your Answer:
                </label>
                <input
                  type="text"
                  placeholder="Type your answer here..."
                  className="w-full p-3 border border-gray-300 rounded-lg text-lg"
                  disabled
                />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className={`min-h-screen bg-white ${roboto.className}`}>
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
                {quiz.title.length}/{CHARACTER_LIMITS.title} • {quiz.questions.length} questions
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
        <div className="p-4 bg-gray-50 min-h-screen">
          <div
            ref={questionListRef}
            className="pb-20 max-w-2xl mx-auto"
          >
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
              <>
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-500">
                    Drag vertically to reorder • Swipe right to edit • Swipe left to delete
                  </p>
                </div>
                {quiz.questions.map((question, index) => (
                  <StudentQuestionCard key={question.id} question={question} index={index} />
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Question Form */}
      {showQuestionForm && quiz.questions[currentQuestionIndex] && (
        <div className="p-4 pb-20 bg-gray-50 min-h-screen">
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

          <div className="max-w-2xl mx-auto" ref={questionFormRef}>
            <QuestionForm
              question={quiz.questions[currentQuestionIndex]}
              index={currentQuestionIndex}
            />
          </div>

          {/* Navigation between questions */}
          {quiz.questions.length > 1 && (
            <div className="flex justify-between mt-4 max-w-2xl mx-auto">
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-lg p-6 max-w-sm w-full"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Question
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this question? This action cannot
              be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteQuestion(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Floating Add Button with Question Type Options */}
      <div className="floating-add-container fixed bottom-6 right-6 z-50">
        {/* Question Type Options */}
        {showQuestionTypes && (
          <motion.div
            className="absolute bottom-20 right-0 flex flex-col space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {/* Multiple Choice Button */}
            <motion.button
              onClick={() => addQuestion("multiple-choice")}
              className="flex items-center bg-white text-gray-800 px-4 py-3 rounded-xl shadow-lg hover:shadow-xl border border-gray-200 hover:border-blue-300 transition-all group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-200">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              </div>
              <span className="font-medium whitespace-nowrap">Multiple Choice</span>
            </motion.button>

            {/* True/False Button */}
            <motion.button
              onClick={() => addQuestion("true-false")}
              className="flex items-center bg-white text-gray-800 px-4 py-3 rounded-xl shadow-lg hover:shadow-xl border border-gray-200 hover:border-green-300 transition-all group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-green-200">
                <Check size={16} className="text-green-600" />
              </div>
              <span className="font-medium whitespace-nowrap">True/False</span>
            </motion.button>

            {/* Image-Based Button */}
            <motion.button
              onClick={() => addQuestion("image-based")}
              className="flex items-center bg-white text-gray-800 px-4 py-3 rounded-xl shadow-lg hover:shadow-xl border border-gray-200 hover:border-purple-300 transition-all group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-purple-200">
                <Image size={16} className="text-purple-600" />
              </div>
              <span className="font-medium whitespace-nowrap">Image-Based</span>
            </motion.button>
          </motion.div>
        )}

        {/* Main Add Button */}
        <motion.button
          onClick={() => setShowQuestionTypes(!showQuestionTypes)}
          className="w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          animate={{ rotate: showQuestionTypes ? 45 : 0 }}
        >
          <Plus size={24} />
        </motion.button>

        {/* Add Question Label */}
        {!showQuestionTypes && (
          <motion.div
            className="absolute bottom-16 right-0 bg-gray-800 text-white text-sm px-3 py-2 rounded-lg shadow-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
          >
            Add Question
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
