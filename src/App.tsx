import { useState, useEffect, useRef } from 'react';
import { Minus, Plus, Droplet, Pill, Heart, ChevronLeft, CheckCircle2, Send, Paperclip, Mic, AlertTriangle } from 'lucide-react';

type FormStep = 'age-verification' | 'patient-info' | 'chatbot' | 'lifestyle';

interface ChatMessage {
  role: 'user' | 'bot';
  message: string;
  emotion?: 'supportive' | 'urgent' | 'reassuring' | 'celebratory';
}

export default function App() {
  const [currentStep, setCurrentStep] = useState<FormStep>('age-verification');
  const [selectedOption, setSelectedOption] = useState<'medicine' | 'lifestyle' | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationContext, setConversationContext] = useState<any>({});
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    symptoms: '',
    symptomDuration: 1,
    symptomUnit: 'days',
    mealsPerDay: 0,
    waterIntake: 0,
    lastMeal: '',
    selectedFoods: [] as string[],
    additionalInfo: '',
    exerciseFrequency: 'never',
    sleepHours: 7,
    stressLevel: 'moderate',
    smokingStatus: 'non-smoker',
    alcoholConsumption: 'none'
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const detectEmergencySymptoms = (text: string): boolean => {
    const emergencyKeywords = [
      'chest pain', 'cant breathe', 'shortness of breath', 'severe pain',
      'suicide', 'kill myself', 'confused', 'slurred speech', 'seizure',
      'unconscious', 'severe bleeding', 'heart attack', 'stroke'
    ];
    return emergencyKeywords.some(keyword => text.toLowerCase().includes(keyword));
  };

  const detectEmotionalTone = (text: string): 'worried' | 'frustrated' | 'tired' | 'neutral' => {
    const worriedWords = ['worried', 'scared', 'afraid', 'anxious', 'nervous', 'concerned'];
    const frustratedWords = ['frustrated', 'angry', 'annoyed', 'upset', 'fed up'];
    const tiredWords = ['exhausted', 'tired', 'fatigue', 'drained', 'weak'];
    
    const lowerText = text.toLowerCase();
    if (worriedWords.some(w => lowerText.includes(w))) return 'worried';
    if (frustratedWords.some(w => lowerText.includes(w))) return 'frustrated';
    if (tiredWords.some(w => lowerText.includes(w))) return 'tired';
    return 'neutral';
  };

  const generateEmpathicResponse = (userMessage: string, context: any): string => {
    const emotion = detectEmotionalTone(userMessage);
    
    if (detectEmergencySymptoms(userMessage)) {
      return "⚠️ Your symptoms sound serious and need immediate attention. Please consult a doctor or visit a healthcare facility right away. Your safety is the top priority.";
    }

    let response = '';
    
    if (emotion === 'worried') {
      response += "I can sense you're feeling worried, and that's completely understandable when you're not feeling well. You're taking the right steps by reaching out. ";
    } else if (emotion === 'frustrated') {
      response += "I hear your frustration, and I'm here to help. It's okay to feel this way. Let's work through this together. ";
    } else if (emotion === 'tired') {
      response += "I know you're feeling exhausted right now. Your body needs rest, and it's okay to take it slow. ";
    }

    if (selectedOption === 'medicine') {
      if (!context.medicineExplained) {
        response += "\n\n💊 Based on what you've shared, let me explain some options that might help:\n\n";
        
        if (formData.symptoms.toLowerCase().includes('fever') || formData.symptoms.toLowerCase().includes('headache')) {
          response += "**Paracetamol (Acetaminophen)** could be helpful here. It works by reducing fever and relieving mild to moderate pain. People commonly use it for viral fever, headaches, and body aches.\n\n";
          response += "**How to use it safely:**\n";
          response += "• Adults: 500-1000mg every 6 hours\n";
          response += "• Maximum: 4000mg (4 grams) in 24 hours\n";
          response += "• Take with water, with or without food\n\n";
          response += "**Expected timeline:** Most people start feeling relief within 30-60 minutes, and with rest, symptoms typically improve within 2-3 days. Full recovery usually takes 5-7 days for viral illnesses.\n\n";
        } else {
          response += "For your symptoms, over-the-counter options might help, depending on what you're experiencing. Could you tell me more about what's bothering you most?\n\n";
        }
        
        response += "**Important reminder:** This information is for educational purposes only. If symptoms persist beyond 3-4 days, worsen, or you have any concerns, please consult a healthcare professional for personalized advice. 🌿";
        
        setConversationContext({...context, medicineExplained: true});
      } else {
        response += "That's a smart question! " + getFollowUpMedicineResponse(userMessage, context);
      }
    } else if (selectedOption === 'lifestyle') {
      if (!context.lifestyleAdviceGiven) {
        response += "\n\n🌿 Let me share some practical lifestyle changes that can help:\n\n";
        
        response += "**Hydration** 💧\n";
        response += `Your current intake: ${formData.waterIntake}L per day. `;
        if (formData.waterIntake < 2) {
          response += "Try gradually increasing to 2-3L daily. This helps with fatigue, headaches, and overall energy.\n";
          response += "**Expected result:** You should notice improved focus and reduced fatigue within 2-3 days.\n\n";
        } else {
          response += "That's great! You're staying well hydrated. 👏\n\n";
        }
        
        response += "**Sleep** 😴\n";
        response += `Current: ${formData.sleepHours} hours. `;
        if (formData.sleepHours < 7) {
          response += "Aim for 7-9 hours per night. Good sleep boosts immunity and mood.\n";
          response += "**Expected result:** Within a week, you'll likely feel more energized and resilient.\n\n";
        } else {
          response += "That's a healthy amount! Keep it up. 👏\n\n";
        }
        
        response += "**Exercise** 🏃\n";
        if (formData.exerciseFrequency === 'never' || formData.exerciseFrequency === 'rarely') {
          response += "Starting with just 15-20 minutes of light walking daily can significantly improve your energy and mood.\n";
          response += "**Expected result:** You'll start feeling more energetic within 3-5 days.\n\n";
        }
        
        response += "**Remember:** Small, consistent changes work better than big sudden shifts. You're doing great by paying attention to your health! 💚\n\n";
        response += "*This guidance is educational. For persistent concerns, please consult a healthcare provider.*";
        
        setConversationContext({...context, lifestyleAdviceGiven: true});
      } else {
        response += getFollowUpLifestyleResponse(userMessage, context);
      }
    }

    return response;
  };

  const getFollowUpMedicineResponse = (message: string, context: any): string => {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('side effect')) {
      return "Common side effects of Paracetamol are rare but can include nausea or allergic reactions. The most important thing is never to exceed the maximum dose (4g/day) as it can harm your liver. If you notice anything unusual, stop taking it and consult a doctor. You're being smart by asking! 👍";
    }
    
    if (lowerMsg.includes('how long') || lowerMsg.includes('when')) {
      return "Most people feel relief within 30-60 minutes of taking the medication. For full recovery from your symptoms, it typically takes 5-7 days with proper rest and care. Keep monitoring how you feel! 🌟";
    }
    
    if (lowerMsg.includes('alternative') || lowerMsg.includes('natural')) {
      return "Natural alternatives include: rest (your body heals during sleep), staying hydrated (helps flush out toxins), and warm compress for aches. Ginger tea can help with nausea. These work well alongside or instead of medication for mild symptoms. You're taking wonderful care of yourself! 💚";
    }
    
    return "That's a great question. I want to make sure I give you accurate information. For specific concerns about medications, it's best to check with a pharmacist or doctor who can consider your full health picture. Is there anything else about general wellness I can help with? 😊";
  };

  const getFollowUpLifestyleResponse = (message: string, context: any): string => {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('sleep') || lowerMsg.includes('insomnia')) {
      return "For better sleep: avoid screens 1 hour before bed, keep your room cool and dark, and try to go to bed at the same time each night. Chamomile tea or light stretching can help you wind down. Most people see improvements within 3-5 days of consistent routine. You've got this! 😴✨";
    }
    
    if (lowerMsg.includes('stress') || lowerMsg.includes('anxious')) {
      return "Managing stress is so important. Try: 5-minute breathing exercises (inhale 4 counts, hold 4, exhale 4), short walks outdoors, or journaling your thoughts. Even 10 minutes daily can reduce stress significantly. You should feel calmer within a week. You're doing great by addressing this! 🌿";
    }
    
    if (lowerMsg.includes('diet') || lowerMsg.includes('food')) {
      return "Focus on whole foods: fruits, vegetables, lean proteins, and whole grains. Eat regular meals (3 balanced meals or 5 small ones). Avoid excessive caffeine and sugar as they can affect energy and mood. You'll likely notice better energy within 3-4 days. That's a smart focus! 🥗";
    }
    
    return "That's a thoughtful approach! Keep making small, consistent changes. Remember, progress isn't always linear, and every small step counts. Would you like tips on any specific area of your wellness? 💪😊";
  };

  const handleAgeConfirmation = (isOver18: boolean) => {
    if (isOver18) {
      setCurrentStep('patient-info');
    } else {
      alert("You must be 18+ to use this service. Please seek guidance from a parent, guardian, or healthcare professional.");
    }
  };

  const handleNext = () => {
    if (currentStep === 'patient-info' && selectedOption) {
      if (selectedOption === 'medicine') {
        setConversationContext({
          symptoms: formData.symptoms,
          duration: `${formData.symptomDuration} ${formData.symptomUnit}`,
          meals: formData.mealsPerDay,
          water: formData.waterIntake,
          additionalInfo: formData.additionalInfo
        });
        
        const greeting = "Hello! I'm sorry you're not feeling well. I'm here to help you understand your options and feel better. You're taking a smart step by seeking information. 💙\n\nI see you're experiencing " + 
          (formData.symptoms || "some symptoms") + 
          ` for ${formData.symptomDuration} ${formData.symptomUnit}. Let me provide you with some helpful information about medicines that might help.\n\nBut first, tell me — what's bothering you the most right now?`;
        
        setChatMessages([{ role: 'bot', message: greeting, emotion: 'supportive' }]);
        setCurrentStep('chatbot');
      } else if (selectedOption === 'lifestyle') {
        setCurrentStep('lifestyle');
      }
    }
  };

  const handleContinueToChatbot = () => {
    setConversationContext({
      symptoms: formData.symptoms,
      duration: `${formData.symptomDuration} ${formData.symptomUnit}`,
      exercise: formData.exerciseFrequency,
      sleep: formData.sleepHours,
      stress: formData.stressLevel,
      meals: formData.mealsPerDay,
      water: formData.waterIntake
    });
    
    const greeting = "Hello! I'm here to help you build healthier habits and feel your best. You're already doing great by paying attention to your wellness! 🌿\n\n" +
      `I can see you're getting ${formData.sleepHours} hours of sleep and drinking ${formData.waterIntake}L of water daily. ` +
      "Let's talk about what's on your mind. What aspect of your lifestyle would you most like to improve?";
    
    setChatMessages([{ role: 'bot', message: greeting, emotion: 'supportive' }]);
    setCurrentStep('chatbot');
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
      setConversationContext({});
    } else if (currentStep === 'lifestyle') {
      setCurrentStep('patient-info');
    }
  };

  const handleSendMessage = async () => {
    if (chatInput.trim() === '') return;

    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', message: chatInput }];
    setChatMessages(newMessages);
    const currentInput = chatInput;
    setChatInput('');
    setIsLoading(true);

    try {
      // Call Gemini API through Vercel serverless function
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
          chatHistory: chatMessages.slice(-10) // Last 10 messages for context
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      const botResponse = data.response;
      
      setChatMessages(prev => [...prev, { 
        role: 'bot', 
        message: botResponse,
        emotion: detectEmergencySymptoms(currentInput) ? 'urgent' : 'supportive'
      }]);

      // Update context if needed
      setConversationContext(prev => ({
        ...prev,
        lastUserMessage: currentInput,
        messageCount: (prev.messageCount || 0) + 1
      }));
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { 
        role: 'bot', 
        message: "I'm having a moment of trouble connecting. Please try again — I'm here to help! 💙" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIncrement = (field: 'symptomDuration' | 'mealsPerDay') => {
    setFormData(prev => ({ ...prev, [field]: (prev as any)[field] + 1 }));
  };

  const handleDecrement = (field: 'symptomDuration' | 'mealsPerDay') => {
    setFormData(prev => ({ ...prev, [field]: Math.max(0, (prev as any)[field] - 1) }));
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
    setFormData(prev => {
      const isSelected = prev.selectedFoods.includes(foodName);
      if (isSelected) {
        return { ...prev, selectedFoods: prev.selectedFoods.filter(f => f !== foodName) };
      } else {
        return { ...prev, selectedFoods: [...prev.selectedFoods, foodName] };
      }
    });
  };

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
              <p className="text-sm text-purple-700 mt-1">This service is intended for users 18 years and older.</p>
            </div>
            
            <p className="text-gray-700 text-center mb-6">Are you 18 years of age or older?</p>
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
            By continuing, you confirm you meet the age requirement. If you are under 18, please seek guidance from a parent, guardian, or healthcare professional.
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
                className={`p-2 rounded-lg ${selectedOption === 'medicine' ? 'text-blue-700 hover:bg-blue-100' : 'text-teal-700 hover:bg-teal-100'}`}
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
                <strong>Important:</strong> This information is for educational purposes only and does not replace professional medical advice.
              </p>
            </div>
          </div>

          <div className={`bg-white rounded-3xl shadow-lg border-2 ${selectedOption === 'medicine' ? 'border-blue-200' : 'border-teal-200'} overflow-hidden`}>
            <div className="h-[500px] overflow-y-auto p-6 space-y-4">
              {chatMessages.map((msg, index) => (
                <div 
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user' 
                      ? selectedOption === 'medicine'
                        ? 'bg-blue-500 text-white'
                        : 'bg-teal-500 text-white'
                      : msg.emotion === 'urgent'
                      ? 'bg-red-50 text-red-900 border-2 border-red-300'
                      : 'bg-gray-50 text-gray-900'
                  }`}>
                    <div className="whitespace-pre-line">{msg.message}</div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className={`border-t-2 ${selectedOption === 'medicine' ? 'border-blue-200' : 'border-teal-200'} p-4`}>
              <div className="flex gap-2">
                <button className={`p-2 border rounded-lg ${selectedOption === 'medicine' ? 'border-blue-300 text-blue-600 hover:bg-blue-50' : 'border-teal-300 text-teal-600 hover:bg-teal-50'}`}>
                  <Paperclip className="w-5 h-5" />
                </button>
                <button className={`p-2 border rounded-lg ${selectedOption === 'medicine' ? 'border-blue-300 text-blue-600 hover:bg-blue-50' : 'border-teal-300 text-teal-600 hover:bg-teal-50'}`}>
                  <Mic className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                  className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${selectedOption === 'medicine' ? 'border-blue-300 focus:ring-blue-500' : 'border-teal-300 focus:ring-teal-500'}`}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !chatInput.trim()}
                  className={`px-4 py-2 rounded-lg text-white disabled:opacity-50 ${selectedOption === 'medicine' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-teal-600 hover:bg-teal-700'}`}
                >
                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.928l3-2.647z"></path>
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
              <button onClick={handleBack} className="p-2 rounded-lg text-teal-700 hover:bg-teal-100">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-teal-900">Lifestyle Guidance</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 shadow-sm border border-teal-200">
              <label className="block mb-3 font-semibold text-teal-900">Exercise Frequency</label>
              <select
                value={formData.exerciseFrequency}
                onChange={(e) => setFormData(prev => ({ ...prev, exerciseFrequency: e.target.value }))}
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
              <label className="block mb-3 font-semibold text-indigo-900">Average Sleep Hours</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFormData(prev => ({ ...prev, sleepHours: Math.max(0, prev.sleepHours - 1) }))}
                  className="h-9 w-9 border border-indigo-300 rounded-lg text-indigo-700 hover:bg-indigo-100 flex items-center justify-center"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  value={formData.sleepHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, sleepHours: parseInt(e.target.value) || 0 }))}
                  className="text-center h-9 flex-1 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => setFormData(prev => ({ ...prev, sleepHours: Math.min(24, prev.sleepHours + 1) }))}
                  className="h-9 w-9 border border-indigo-300 rounded-lg text-indigo-700 hover:bg-indigo-100 flex items-center justify-center"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-indigo-600 mt-2">{formData.sleepHours} hours per night</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 shadow-sm border border-amber-200">
              <label className="block mb-3 font-semibold text-amber-900">Current Stress Level</label>
              <select
                value={formData.stressLevel}
                onChange={(e) => setFormData(prev => ({ ...prev, stressLevel: e.target.value }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, smokingStatus: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="non-smoker">Non-Smoker</option>
                <option value="former-smoker">Former Smoker</option>
                <option value="occasional">Occasional Smoker</option>
                <option value="regular">Regular Smoker</option>
              </select>
            </div>

            <div className="md:col-span-2 bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-rose-200">
              <label className="block mb-3 font-semibold text-rose-900">Alcohol Consumption</label>
              <select
                value={formData.alcoholConsumption}
                onChange={(e) => setFormData(prev => ({ ...prev, alcoholConsumption: e.target.value }))}
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
            <button className="px-8 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" onClick={handleBack}>
              Back
            </button>
            <button className="bg-teal-600 text-white hover:bg-teal-700 px-8 py-2 rounded-lg" onClick={handleContinueToChatbot}>
              Continue to Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              onChange={(e) => setFormData(prev => ({ ...prev, symptoms: e.target.value }))}
              className="w-full min-h-[120px] resize-none border border-blue-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 shadow-sm border border-teal-200">
            <label className="block mb-3 font-semibold text-teal-900">
              Since when have you been experiencing these symptoms? <span className="text-red-500">*</span>
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
                  onChange={(e) => setFormData(prev => ({ ...prev, symptomDuration: parseInt(e.target.value) || 0 }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, symptomUnit: e.target.value }))}
                className="w-[110px] px-2 py-2 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="hours">hours</option>
                <option value="days">days</option>
                <option value="weeks">weeks</option>
                <option value="months">months</option>
              </select>
            </div>
          </div>

          <div className={`${getMealCardColor()} rounded-2xl p-6 shadow-sm text-white transition-colors duration-300`}>
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
                onClick={() => setFormData(prev => ({ ...prev, waterIntake: Math.max(0, prev.waterIntake - 1) }))}
                className="flex flex-col items-center transition-all duration-200 hover:scale-110"
              >
                <div className="w-10 h-14 rounded-lg border-2 border-dashed border-cyan-400 bg-cyan-100 flex items-center justify-center hover:bg-cyan-200">
                  <Minus className="w-5 h-5 text-cyan-600" />
                </div>
              </button>
              {Array.from({ length: Math.max(4, formData.waterIntake) }, (_, index) => index + 1).map((bottleNum) => (
                <button
                  key={bottleNum}
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    waterIntake: prev.waterIntake === bottleNum ? bottleNum - 1 : bottleNum 
                  }))}
                  className="flex flex-col items-center transition-all duration-200 hover:scale-110"
                >
                  <div className={`w-10 h-14 rounded-lg border-2 flex items-center justify-center transition-colors ${
                    formData.waterIntake >= bottleNum 
                      ? 'bg-cyan-500 border-cyan-600' 
                      : 'bg-white border-cyan-300'
                  }`}>
                    <Droplet className={`w-5 h-5 ${formData.waterIntake >= bottleNum ? 'text-white fill-white' : 'text-cyan-300'}`} />
                  </div>
                </button>
              ))}
              <button
                onClick={() => setFormData(prev => ({ ...prev, waterIntake: Math.max(prev.waterIntake + 1, 5) }))}
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
              onChange={(e) => setFormData(prev => ({ ...prev, lastMeal: e.target.value }))}
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
              onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
              className="w-full min-h-[80px] resize-none border border-blue-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <button
            onClick={() => setSelectedOption(prev => prev === 'medicine' ? null : 'medicine')}
            className={`rounded-2xl p-6 shadow-sm transition-all duration-200 text-left border-2 ${
              selectedOption === 'medicine'
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-600 shadow-lg scale-105'
                : 'bg-white text-blue-900 border-blue-200 hover:border-blue-400 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <Pill className={`w-8 h-8 ${selectedOption === 'medicine' ? 'text-white' : 'text-blue-600'}`} />
              {selectedOption === 'medicine' && (
                <CheckCircle2 className="w-6 h-6 text-white" />
              )}
            </div>
            <h3 className="text-lg font-semibold mb-1">Medicine Information</h3>
            <p className={`text-sm ${selectedOption === 'medicine' ? 'text-blue-100' : 'text-blue-600'}`}>
              Add medication details
            </p>
          </button>

          <button
            onClick={() => setSelectedOption(prev => prev === 'lifestyle' ? null : 'lifestyle')}
            className={`rounded-2xl p-6 shadow-sm transition-all duration-200 text-left border-2 ${
              selectedOption === 'lifestyle'
                ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white border-teal-600 shadow-lg scale-105'
                : 'bg-white text-teal-900 border-teal-200 hover:border-teal-400 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <Heart className={`w-8 h-8 ${selectedOption === 'lifestyle' ? 'text-white' : 'text-teal-600'}`} />
              {selectedOption === 'lifestyle' && (
                <CheckCircle2 className="w-6 h-6 text-white" />
              )}
            </div>
            <h3 className="text-lg font-semibold mb-1">Lifestyle Guidance</h3>
            <p className={`text-sm ${selectedOption === 'lifestyle' ? 'text-teal-100' : 'text-teal-600'}`}>
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
