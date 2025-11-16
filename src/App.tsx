import { useState, useEffect, useRef } from 'react';
import {
  Minus,
  Plus,
  Droplet,
  Pill,
  Heart,
  ChevronLeft,
  CheckCircle2,
  Send,
  Paperclip,
  Mic,
  AlertTriangle,
} from 'lucide-react';

type FormStep = 'age-verification' | 'patient-info' | 'chatbot' | 'lifestyle';

interface ChatMessage {
  role: 'user' | 'bot';
  message: string;
  emotion?: 'supportive' | 'urgent' | 'reassuring' | 'celebratory';
}

interface FormData {
  symptoms: string;
  symptomDuration: number;
  symptomUnit: string;
  mealsPerDay: number;
  waterIntake: number;
  lastMeal: string;
  selectedFoods: string[];
  additionalInfo: string;
  exerciseFrequency: string;
  sleepHours: number;
  stressLevel: string;
  smokingStatus: string;
  alcoholConsumption: string;
}

export default function App() {
  const [currentStep, setCurrentStep] = useState<FormStep>('age-verification');
  const [selectedOption, setSelectedOption] = useState<'medicine' | 'lifestyle' | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationContext, setConversationContext] = useState<any>({});
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // File upload state
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Speech-to-text state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [formData, setFormData] = useState<FormData>({
    symptoms: '',
    symptomDuration: 1,
    symptomUnit: 'days',
    mealsPerDay: 0,
    waterIntake: 0,
    lastMeal: '',
    selectedFoods: [],
    additionalInfo: '',
    exerciseFrequency: 'never',
    sleepHours: 7,
    stressLevel: 'moderate',
    smokingStatus: 'non-smoker',
    alcoholConsumption: 'none',
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const detectEmergencySymptoms = (text: string): boolean => {
    const emergencyKeywords = [
      'chest pain',
      'cant breathe',
      'shortness of breath',
      'severe pain',
      'suicide',
      'kill myself',
      'confused',
      'slurred speech',
      'seizure',
      'unconscious',
      'severe bleeding',
      'heart attack',
      'stroke',
    ];
    return emergencyKeywords.some((keyword) => text.toLowerCase().includes(keyword));
  };

  const detectEmotionalTone = (
    text: string
  ): 'worried' | 'frustrated' | 'tired' | 'neutral' => {
    const worriedWords = ['worried', 'scared', 'afraid', 'anxious', 'nervous', 'concerned'];
    const frustratedWords = ['frustrated', 'angry', 'annoyed', 'upset', 'fed up'];
    const tiredWords = ['exhausted', 'tired', 'fatigue', 'drained', 'weak'];

    const lowerText = text.toLowerCase();
    if (worriedWords.some((w) => lowerText.includes(w))) return 'worried';
    if (frustratedWords.some((w) => lowerText.includes(w))) return 'frustrated';
    if (tiredWords.some((w) => lowerText.includes(w))) return 'tired';
    return 'neutral';
  };

  // (kept for possible local logic later – not used to generate Gemini replies)
  const generateEmpathicResponse = (userMessage: string, context: any): string => {
    const emotion = detectEmotionalTone(userMessage);

    if (detectEmergencySymptoms(userMessage)) {
      return '⚠️ Your symptoms sound serious and need immediate attention. Please consult a doctor or visit a healthcare facility right away. Your safety is the top priority.';
    }

    let response = '';

    if (emotion === 'worried') {
      response +=
        "I can sense you're feeling worried, and that's completely understandable when you're not feeling well. You're taking the right steps by reaching out. ";
    } else if (emotion === 'frustrated') {
      response +=
        "I hear your frustration, and I'm here to help. It's okay to feel this way. Let's work through this together. ";
    } else if (emotion === 'tired') {
      response +=
        "I know you're feeling exhausted right now. Your body needs rest, and it's okay to take it slow. ";
    }

    if (selectedOption === 'medicine') {
      if (!context.medicineExplained) {
        response += '\n\nBased on what you have shared, here are some general options that might help.\n\n';

        if (
          formData.symptoms.toLowerCase().includes('fever') ||
          formData.symptoms.toLowerCase().includes('headache')
        ) {
          response +=
            'Paracetamol (acetaminophen) can help reduce fever and relieve mild to moderate pain. People often use it for viral fever, headaches, and body aches.\n\n';
          response +=
            'Most people start feeling relief within 30-60 minutes, and with rest, symptoms typically improve in a few days.\n\n';
        } else {
          response +=
            "For your symptoms, over-the-counter options might help, depending on what you're experiencing. Could you tell me more about what is bothering you most?\n\n";
        }

        response +=
          'Important reminder: this information is for education only. If symptoms last beyond a few days, worsen, or you have any concerns, please speak with a healthcare professional.';

        setConversationContext({ ...context, medicineExplained: true });
      } else {
        response += "That is a good question. " + getFollowUpMedicineResponse(userMessage, context);
      }
    } else if (selectedOption === 'lifestyle') {
      if (!context.lifestyleAdviceGiven) {
        response += '\n\nHere are some practical lifestyle changes that can help:\n\n';

        response += 'Hydration:\n';
        response += `Your current intake is about ${formData.waterIntake} litres per day. `;
        if (formData.waterIntake < 2) {
          response +=
            'Gradually increasing to around 2–3 litres daily can help with fatigue, headaches, and overall energy.\n';
        } else {
          response += "You are already staying well hydrated, which is great.\n";
        }

        response += '\nSleep:\n';
        response += `You sleep about ${formData.sleepHours} hours per night. `;
        if (formData.sleepHours < 7) {
          response += 'Aim for 7–9 hours each night. Good sleep supports immunity and mood.\n';
        } else {
          response += 'That is a healthy amount of sleep. Try to keep a steady routine.\n';
        }

        response += '\nExercise:\n';
        if (
          formData.exerciseFrequency === 'never' ||
          formData.exerciseFrequency === 'rarely'
        ) {
          response +=
            'Starting with 15–20 minutes of light walking most days can noticeably boost energy and mood over time.\n';
        }

        response +=
          '\nRemember: small, consistent steps usually work better than big sudden changes. This is general guidance, so please talk with a healthcare provider for any medical issues.';

        setConversationContext({ ...context, lifestyleAdviceGiven: true });
      } else {
        response += getFollowUpLifestyleResponse(userMessage, context);
      }
    }

    return response;
  };

  const getFollowUpMedicineResponse = (message: string, context: any): string => {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('side effect')) {
      return 'Common medicines for fever and pain can sometimes cause stomach upset, allergic reactions, or other side effects. Always read the package leaflet carefully, follow the directions, and speak with a doctor or pharmacist if you notice anything unusual.';
    }

    if (lowerMsg.includes('how long') || lowerMsg.includes('when')) {
      return 'Many people start to feel some relief within about 30–60 minutes after taking fever or pain relief medicines, but full recovery from an illness can take several days. Rest, fluids, and nutrition are just as important as medicine.';
    }

    if (lowerMsg.includes('alternative') || lowerMsg.includes('natural')) {
      return 'Gentle home care can also help: resting, staying hydrated, using warm soups or teas, and light clothing or a cool compress for fever. These approaches can support your body alongside any medicine your doctor or pharmacist recommends.';
    }

    return 'For detailed questions about a specific medicine, dose, or schedule, it is safest to ask a pharmacist or doctor who knows your full health history. I can keep helping with general guidance if you like.';
  };

  const getFollowUpLifestyleResponse = (message: string, context: any): string => {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('sleep') || lowerMsg.includes('insomnia')) {
      return 'For better sleep, try keeping a regular bedtime, limiting screens for an hour before bed, and keeping your room dark and cool. Many people notice some improvement after a few nights of a consistent routine.';
    }

    if (lowerMsg.includes('stress') || lowerMsg.includes('anxious')) {
      return 'Short breathing exercises, light movement like walking, and taking short breaks away from screens can help with stress. Even 10 minutes a day of something calming can make a difference over time.';
    }

    if (lowerMsg.includes('diet') || lowerMsg.includes('food')) {
      return 'Focusing on regular meals with fruits, vegetables, whole grains, and protein can support energy and mood. Reducing very sugary drinks and heavy late-night meals may also help you feel better day to day.';
    }

    return 'Small lifestyle changes build up over time. If you tell me which area you want to focus on most, I can share more specific general suggestions.';
  };

  // ---- Speech-to-text handler ----
  const handleMicClick = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please try Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      transcript = transcript.trim();
      if (transcript) {
        setChatInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
  };

  // ---- File → base64 helper ----
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          const base64 = result.split(',')[1] ?? '';
          resolve(base64);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Start conversation with Gemini using form data
  const startChatWithGemini = async (mode: 'medicine' | 'lifestyle') => {
    setConversationContext((prev: any) => ({
      ...prev,
      pathType: mode,
      patientInfo: formData,
    }));

    setCurrentStep('chatbot');
    setChatMessages([]);
    setIsLoading(true);

    try {
      const initialMessage =
        mode === 'medicine'
          ? `The user has just filled a symptom form.
Please:
1) Greet them warmly and acknowledge how they might be feeling.
2) Summarise their symptoms and how long they have been present.
3) Give exactly 3–5 short bullets under "What You Are Experiencing And How To Support Recovery". Each bullet must be a single concise sentence (under 20 words).
4) Give 2–4 bullets under "Common Over-The-Counter Options" naming general categories people often use, matching their symptoms.
5) Give 2–4 bullets under "How Each Option Helps And Typical Use" explaining briefly what each option helps with and that it is often taken every few hours as directed on the package (no exact mg or personal dosing).
6) Give 3–5 bullets under "When To See A Doctor Or Get Urgent Help" listing clear warning signs.
7) Finish with one short line reminding them this is general education, not a diagnosis.`
          : `The user has just filled a lifestyle and wellness questionnaire.
Please:
1) Summarise their current habits in 3–5 bullets under "Your Current Habits At A Glance".
2) Suggest 4–6 specific but gentle changes under "Small Changes You Can Start With".
3) Explain realistic timelines in 3–5 bullets under "What You Might Notice Over Time".
4) Give 3–5 bullets under "When To Get Extra Support" describing when it would help to talk to a professional.
5) Finish with one short line saying this is general wellness guidance, not a substitute for medical care.`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: initialMessage,
          pathType: mode,
          patientInfo: formData,
          chatHistory: [],
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();

      setChatMessages([
        {
          role: 'bot',
          message: data.response,
          emotion: 'supportive',
        },
      ]);
    } catch (error) {
      console.error('Initial chat error:', error);
      setChatMessages([
        {
          role: 'bot',
          message:
            "I'm having a moment of trouble connecting. Please try again — I'm here to help! 💙",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgeConfirmation = (isOver18: boolean) => {
    if (isOver18) {
      setCurrentStep('patient-info');
    } else {
      alert(
        'You must be 18+ to use this service. Please seek guidance from a parent, guardian, or healthcare professional.'
      );
    }
  };

  const handleNext = () => {
    if (currentStep === 'patient-info' && selectedOption) {
      if (selectedOption === 'medicine') {
        startChatWithGemini('medicine');
      } else if (selectedOption === 'lifestyle') {
        setCurrentStep('lifestyle');
      }
    }
  };

  const handleContinueToChatbot = () => {
    startChatWithGemini('lifestyle');
  };

  const handleBack = () => {
    if (currentStep === 'chatbot') {
      if (selectedOption === 'medicine') {
        setCurrentStep('patient-info');
      } else if (selectedOption === 'lifestyle') {
        setCurrentStep('lifestyle');
      }
      setChatMessages([]);
      setChatInput('');
      setAttachedFile(null);
      setConversationContext({});
    } else if (currentStep === 'lifestyle') {
      setCurrentStep('patient-info');
    }
  };

  // Send message (text + optional file)
  const handleSendMessage = async () => {
    if (chatInput.trim() === '' && !attachedFile) return;

    const displayText = chatInput.trim() || (attachedFile ? '[File uploaded]' : '');
    const newMessages: ChatMessage[] = [
      ...chatMessages,
      { role: 'user', message: displayText },
    ];
    setChatMessages(newMessages);

    const currentInput = chatInput;
    setChatInput('');
    setIsLoading(true);

    try {
      let filePayload: any = null;

      if (attachedFile) {
        const base64 = await fileToBase64(attachedFile);
        filePayload = {
          name: attachedFile.name,
          type: attachedFile.type || 'application/octet-stream',
          data: base64,
        };
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          context: conversationContext,
          pathType: selectedOption,
          patientInfo: formData,
          chatHistory: newMessages.slice(-10),
          file: filePayload,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      const botResponse = data.response;

      setChatMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          message: botResponse,
          emotion: detectEmergencySymptoms(currentInput) ? 'urgent' : 'supportive',
        },
      ]);

      setConversationContext((prev: any) => ({
        ...prev,
        lastUserMessage: currentInput,
        messageCount: (prev?.messageCount || 0) + 1,
      }));
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          message:
            "I'm having a moment of trouble connecting. Please try again — I'm here to help! 💙",
        },
      ]);
    } finally {
      setIsLoading(false);
      setAttachedFile(null);
    }
  };

  const handleIncrement = (field: 'symptomDuration' | 'mealsPerDay') => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field] + 1,
    }));
  };

  const handleDecrement = (field: 'symptomDuration' | 'mealsPerDay') => {
    setFormData((prev) => ({
      ...prev,
      [field]: Math.max(0, prev[field] - 1),
    }));
  };

  const getMealCardColor = () => {
    if (formData.mealsPerDay === 0) return 'bg-gradient-to-br from-gray-400 to-gray-500';
    if (formData.mealsPerDay === 1) return 'bg-gradient-to-br from-red-500 to-red-600';
    if (formData.mealsPerDay === 2) return 'bg-gradient-to-br from-orange-500 to-orange-600';
    return 'bg-gradient-to-br from-emerald-500 to-emerald-600';
  };

  const foodOptions = [
    { name: 'Eggs', emoji: '🥚' },
    { name: 'Juice', emoji: '🧃' },
    { name: 'Sandwich', emoji: '🥪' },
    { name: 'Salad', emoji: '🥗' },
    { name: 'Rice', emoji: '🍚' },
    { name: 'Pasta', emoji: '🍝' },
    { name: 'Soup', emoji: '🍲' },
    { name: 'Fruits', emoji: '🍎' },
    { name: 'Coffee', emoji: '☕' },
  ];

  const toggleFood = (foodName: string) => {
    setFormData((prev) => {
      const isSelected = prev.selectedFoods.includes(foodName);
      if (isSelected) {
        return { ...prev, selectedFoods: prev.selectedFoods.filter((f) => f !== foodName) };
      } else {
        return { ...prev, selectedFoods: [...prev.selectedFoods, foodName] };
      }
    });
  };

  // ---- Format bot text: bold headings + bullets ----
  const renderBotMessage = (text: string) => {
    const headings = new Set([
      'What You Are Experiencing And How To Support Recovery',
      'Common Over-The-Counter Options',
      'How Each Option Helps And Typical Use',
      'When To See A Doctor Or Get Urgent Help',
      'Your Current Habits At A Glance',
      'Small Changes You Can Start With',
      'What You Might Notice Over Time',
      'When To Get Extra Support',
    ]);

    return text.split('\n').map((line, index) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return <div key={index} className="h-2" />;
      }

      if (headings.has(trimmed)) {
        return (
          <p key={index} className="font-semibold mb-1">
            {trimmed}
          </p>
        );
      }

      if (trimmed.startsWith('- ')) {
        return (
          <p key={index} className="pl-4 mb-0.5">
            • {trimmed.slice(2)}
          </p>
        );
      }

      return (
        <p key={index} className="mb-1">
          {trimmed}
        </p>
      );
    });
  };

  // --------- RENDERING ---------

  if (currentStep === 'age-verification') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border-2 border-purple-200">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-purple-700 mb-2">Medsafe</h1>
            <p className="text-gray-600">Your Health Companion</p>
          </div>

          <div className="mb-6">
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-lg mb-4">
              <p className="text-purple-900 font-medium">Age Verification Required</p>
              <p className="text-sm text-purple-700 mt-1">
                This service is intended for users 18 years and older.
              </p>
            </div>

            <p className="text-gray-700 text-center mb-6">
              Are you 18 years of age or older?
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleAgeConfirmation(true)}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              Yes, I am 18 or older
            </button>
            <button
              onClick={() => handleAgeConfirmation(false)}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all"
            >
              No, I am under 18
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-6">
            By continuing, you confirm you meet the age requirement. If you are under 18, please seek
            guidance from a parent, guardian, or healthcare professional.
          </p>
        </div>
      </div>
    );
  }

  if (currentStep === 'chatbot') {
    return (
      <div className="min-h-screen bg-blue-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className={`p-2 rounded-lg ${
                  selectedOption === 'medicine'
                    ? 'text-blue-700 hover:bg-blue-100'
                    : 'text-teal-700 hover:bg-teal-100'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                {selectedOption === 'medicine' ? (
                  <>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Pill className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-blue-900">Medicine Assistant</h1>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-teal-900">Lifestyle Coach</h1>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mb-4 bg-amber-50 border-l-4 border-amber-400 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>Important:</strong> This information is for educational purposes only and
                does not replace professional medical advice.
              </p>
            </div>
          </div>

          <div
            className={`bg-white rounded-3xl shadow-lg border-2 ${
              selectedOption === 'medicine' ? 'border-blue-200' : 'border-teal-200'
            } overflow-hidden`}
          >
            <div className="h-[500px] overflow-y-auto p-6 space-y-4">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? selectedOption === 'medicine'
                          ? 'bg-blue-500 text-white'
                          : 'bg-teal-500 text-white'
                        : msg.emotion === 'urgent'
                        ? 'bg-red-50 text-red-900 border-2 border-red-300'
                        : 'bg-gray-50 text-gray-900'
                    }`}
                  >
                    {msg.role === 'bot' ? (
                      <div className="space-y-0.5">{renderBotMessage(msg.message)}</div>
                    ) : (
                      <div className="whitespace-pre-line">{msg.message}</div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div
              className={`border-t-2 ${
                selectedOption === 'medicine' ? 'border-blue-200' : 'border-teal-200'
              } p-4`}
            >
              {/* hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.txt,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setAttachedFile(file);
                  }
                }}
              />

              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2 border rounded-lg flex items-center justify-center ${
                    selectedOption === 'medicine'
                      ? 'border-blue-300 text-blue-600 hover:bg-blue-50'
                      : 'border-teal-300 text-teal-600 hover:bg-teal-50'
                  }`}
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleMicClick}
                  className={`p-2 border rounded-lg flex items-center justify-center ${
                    selectedOption === 'medicine'
                      ? 'border-blue-300 text-blue-600 hover:bg-blue-50'
                      : 'border-teal-300 text-teal-600 hover:bg-teal-50'
                  } ${isListening ? 'bg-blue-50' : ''}`}
                >
                  <Mic className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} />
                </button>

                {attachedFile && (
                  <span className="text-xs text-gray-500 max-w-[140px] truncate">
                    {attachedFile.name}
                  </span>
                )}

                <input
                  type="text"
                  placeholder="Type your message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === 'Enter' && !isLoading && handleSendMessage()
                  }
                  className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    selectedOption === 'medicine'
                      ? 'border-blue-300 focus:ring-blue-500'
                      : 'border-teal-300 focus:ring-teal-500'
                  }`}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || (!chatInput.trim() && !attachedFile)}
                  className={`px-4 py-2 rounded-lg text-white disabled:opacity-50 ${
                    selectedOption === 'medicine'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-teal-600 hover:bg-teal-700'
                  }`}
                >
                  {isLoading ? (
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.928l3-2.647z"
                      ></path>
                    </svg>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'lifestyle') {
    return (
      <div className="min-h-screen bg-blue-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-2 rounded-lg text-teal-700 hover:bg-teal-100"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-teal-900">Lifestyle Guidance</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 shadow-sm border border-teal-200">
              <label className="block mb-3 font-semibold text-teal-900">
                Exercise Frequency
              </label>
              <select
                value={formData.exerciseFrequency}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, exerciseFrequency: e.target.value }))
                }
                className="w-full px-3 py-2 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="never">Never</option>
                <option value="rarely">Rarely (1-2 times/month)</option>
                <option value="sometimes">Sometimes (1-2 times/week)</option>
                <option value="regularly">Regularly (3-4 times/week)</option>
                <option value="daily">Daily</option>
              </select>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 shadow-sm border border-indigo-200">
              <label className="block mb-3 font-semibold text-indigo-900">
                Average Sleep Hours
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      sleepHours: Math.max(0, prev.sleepHours - 1),
                    }))
                  }
                  className="h-9 w-9 border border-indigo-300 rounded-lg text-indigo-700 hover:bg-indigo-100 flex items-center justify-center"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  value={formData.sleepHours}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      sleepHours: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="text-center h-9 flex-1 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      sleepHours: Math.min(24, prev.sleepHours + 1),
                    }))
                  }
                  className="h-9 w-9 border border-indigo-300 rounded-lg text-indigo-700 hover:bg-indigo-100 flex items-center justify-center"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-indigo-600 mt-2">{formData.sleepHours} hours per night</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 shadow-sm border border-amber-200">
              <label className="block mb-3 font-semibold text-amber-900">
                Current Stress Level
              </label>
              <select
                value={formData.stressLevel}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, stressLevel: e.target.value }))
                }
                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="very-high">Very High</option>
              </select>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-6 shadow-sm border border-slate-200">
              <label className="block mb-3 font-semibold text-slate-900">Smoking Status</label>
              <select
                value={formData.smokingStatus}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, smokingStatus: e.target.value }))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="non-smoker">Non-Smoker</option>
                <option value="former-smoker">Former Smoker</option>
                <option value="occasional">Occasional Smoker</option>
                <option value="regular">Regular Smoker</option>
              </select>
            </div>

            <div className="md:col-span-2 bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-rose-200">
              <label className="block mb-3 font-semibold text-rose-900">
                Alcohol Consumption
              </label>
              <select
                value={formData.alcoholConsumption}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, alcoholConsumption: e.target.value }))
                }
                className="w-full px-3 py-2 border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="none">None</option>
                <option value="occasional">Occasional (1-2 drinks/month)</option>
                <option value="moderate">Moderate (1-2 drinks/week)</option>
                <option value="regular">Regular (3-4 drinks/week)</option>
                <option value="frequent">Frequent (5+ drinks/week)</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              className="px-8 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              onClick={handleBack}
            >
              Back
            </button>
            <button
              className="bg-teal-600 text-white hover:bg-teal-700 px-8 py-2 rounded-lg"
              onClick={handleContinueToChatbot}
            >
              Continue to Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  // patient-info step
  return (
    <div className="min-h-screen bg-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-purple-700">Medsafe</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
          <div className="md:col-span-2 lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-blue-100">
            <label className="block mb-3 font-semibold text-blue-900">
              What symptoms are you experiencing? <span className="text-red-500">*</span>
            </label>
            <textarea
              placeholder="e.g., headache, fever, cough, fatigue..."
              value={formData.symptoms}
              onChange={(e) => setFormData((prev) => ({ ...prev, symptoms: e.target.value }))}
              className="w-full min-h-[120px] resize-none border border-blue-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 shadow-sm border border-teal-200">
            <label className="block mb-3 font-semibold text-teal-900">
              Since when have you been experiencing these symptoms?{' '}
              <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => handleDecrement('symptomDuration')}
                  className="h-9 w-9 border border-teal-300 rounded-lg text-teal-700 hover:bg-teal-100 flex items-center justify-center"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  value={formData.symptomDuration}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      symptomDuration: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="text-center h-9 flex-1 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  onClick={() => handleIncrement('symptomDuration')}
                  className="h-9 w-9 border border-teal-300 rounded-lg text-teal-700 hover:bg-teal-100 flex items-center justify-center"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <select
                value={formData.symptomUnit}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, symptomUnit: e.target.value }))
                }
                className="w-[110px] px-2 py-2 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="hours">hours</option>
                <option value="days">days</option>
                <option value="weeks">weeks</option>
                <option value="months">months</option>
              </select>
            </div>
          </div>

          <div
            className={`${getMealCardColor()} rounded-2xl p-6 shadow-sm text-white transition-colors duration-300`}
          >
            <label className="block mb-3 font-semibold">
              How many meals do you typically have per day?
            </label>
            <div className="flex items-center gap-3 justify-between">
              <button
                onClick={() => handleDecrement('mealsPerDay')}
                className="h-10 w-10 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 flex items-center justify-center"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex-1 text-center">
                <span className="text-3xl font-bold">{formData.mealsPerDay}</span>
                <span className="text-sm ml-2 text-white/80">meals/day</span>
              </div>
              <button
                onClick={() => handleIncrement('mealsPerDay')}
                className="h-10 w-10 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 flex items-center justify-center"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-6 shadow-sm border border-cyan-200">
            <label className="block mb-3 font-semibold text-cyan-900">
              What is your daily water intake?
            </label>
            <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
              <button
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    waterIntake: Math.max(0, prev.waterIntake - 1),
                  }))
                }
                className="flex flex-col items-center transition-all duration-200 hover:scale-110"
              >
                <div className="w-10 h-14 rounded-lg border-2 border-dashed border-cyan-400 bg-cyan-100 flex items-center justify-center hover:bg-cyan-200">
                  <Minus className="w-5 h-5 text-cyan-600" />
                </div>
              </button>
              {Array.from({ length: Math.max(4, formData.waterIntake) }, (_, index) => index + 1).map(
                (bottleNum) => (
                  <button
                    key={bottleNum}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        waterIntake:
                          prev.waterIntake === bottleNum ? bottleNum - 1 : bottleNum,
                      }))
                    }
                    className="flex flex-col items-center transition-all duration-200 hover:scale-110"
                  >
                    <div
                      className={`w-10 h-14 rounded-lg border-2 flex items-center justify-center transition-colors ${
                        formData.waterIntake >= bottleNum
                          ? 'bg-cyan-500 border-cyan-600'
                          : 'bg-white border-cyan-300'
                      }`}
                    >
                      <Droplet
                        className={`w-5 h-5 ${
                          formData.waterIntake >= bottleNum
                            ? 'text-white fill-white'
                            : 'text-cyan-300'
                        }`}
                      />
                    </div>
                  </button>
                )
              )}
              <button
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    waterIntake: Math.max(prev.waterIntake + 1, 5),
                  }))
                }
                className="flex flex-col items-center transition-all duration-200 hover:scale-110"
              >
                <div className="w-10 h-14 rounded-lg border-2 border-dashed border-cyan-400 bg-cyan-100 flex items-center justify-center hover:bg-cyan-200">
                  <Plus className="w-5 h-5 text-cyan-600" />
                </div>
              </button>
            </div>
            <div className="text-center text-sm text-cyan-700 font-medium">
              {formData.waterIntake} L per day
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
            <label className="block mb-3 font-semibold text-emerald-900">
              What was your last meal?
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {foodOptions.map((food) => (
                <button
                  key={food.name}
                  onClick={() => toggleFood(food.name)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 border ${
                    formData.selectedFoods.includes(food.name)
                      ? 'bg-emerald-500 border-emerald-600 text-white'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <span className="mr-1">{food.emoji}</span>
                  {food.name}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Or type your custom meal..."
              value={formData.lastMeal}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, lastMeal: e.target.value }))
              }
              className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100">
            <label className="block mb-3 font-semibold text-blue-900">
              Any additional information?
            </label>
            <textarea
              placeholder="e.g., existing conditions..."
              value={formData.additionalInfo}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, additionalInfo: e.target.value }))
              }
              className="w-full min-h-[80px] resize-none border border-blue-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <button
            onClick={() =>
              setSelectedOption((prev) => (prev === 'medicine' ? null : 'medicine'))
            }
            className={`rounded-2xl p-6 shadow-sm transition-all duration-200 text-left border-2 ${
              selectedOption === 'medicine'
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-600 shadow-lg scale-105'
                : 'bg-white text-blue-900 border-blue-200 hover:border-blue-400 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <Pill
                className={`w-8 h-8 ${
                  selectedOption === 'medicine' ? 'text-white' : 'text-blue-600'
                }`}
              />
              {selectedOption === 'medicine' && (
                <CheckCircle2 className="w-6 h-6 text-white" />
              )}
            </div>
            <h3 className="text-lg font-semibold mb-1">Medicine Information</h3>
            <p
              className={`text-sm ${
                selectedOption === 'medicine' ? 'text-blue-100' : 'text-blue-600'
              }`}
            >
              Add medication details
            </p>
          </button>

          <button
            onClick={() =>
              setSelectedOption((prev) => (prev === 'lifestyle' ? null : 'lifestyle'))
            }
            className={`rounded-2xl p-6 shadow-sm transition-all duration-200 text-left border-2 ${
              selectedOption === 'lifestyle'
                ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white border-teal-600 shadow-lg scale-105'
                : 'bg-white text-teal-900 border-teal-200 hover:border-teal-400 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <Heart
                className={`w-8 h-8 ${
                  selectedOption === 'lifestyle' ? 'text-white' : 'text-teal-600'
                }`}
              />
              {selectedOption === 'lifestyle' && (
                <CheckCircle2 className="w-6 h-6 text-white" />
              )}
            </div>
            <h3 className="text-lg font-semibold mb-1">Lifestyle Guidance</h3>
            <p
              className={`text-sm ${
                selectedOption === 'lifestyle' ? 'text-teal-100' : 'text-teal-600'
              }`}
            >
              Share lifestyle habits
            </p>
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            className="bg-blue-600 text-white hover:bg-blue-700 px-12 py-3 rounded-lg text-lg font-medium disabled:opacity-50"
            onClick={handleNext}
            disabled={!selectedOption}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
