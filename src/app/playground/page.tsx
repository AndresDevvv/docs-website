'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Image as ImageIcon, MessageSquare, Send, Sparkles, Lock, Unlock, Search, RefreshCw, X } from 'lucide-react'
import { stringify } from 'querystring'

const defaultApiBase = 'https://api.zukijourney.com/v1'
const defaultImageModel = 'flux-schnell'

interface Model {
  id: string
  type: string
  is_free: boolean
  endpoint: string
}

interface MessageContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: string
}

interface Message {
  role: 'user' | 'assistant' | 'error'
  content: string | MessageContent[]
  type?: 'text' | 'image' | 'markdown'
}

interface CodeProps {
  node?: any
  inline?: boolean
  className?: string
  children?: React.ReactNode
}

export default function Component() {
  const [apiBase, setApiBase] = useState<string>(defaultApiBase)
  const [apiKey, setApiKey] = useState<string>('')
  const [endpoint, setEndpoint] = useState<'chat' | 'image'>('chat')
  const [model, setModel] = useState<string>('')
  const [models, setModels] = useState<Model[]>([])
  const [filteredModels, setFilteredModels] = useState<Model[]>([])
  const [modelSearch, setModelSearch] = useState<string>('')
  const [prompt, setPrompt] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const fetchModelsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [attachedImages, setAttachedImages] = useState<string[]>([])

  const removeAttachedImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index))
  }

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setAttachedImages(prev => [...prev, e.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }


  useEffect(() => {
    const savedApiKey = localStorage.getItem('apiKey')
    if (savedApiKey) {
      setApiKey(savedApiKey)
    }
  }, [])

  const normalizeModelData = (models: any[]): Model[] => {
    return models.map(model => {
      const idKeywords = ['gpt', 'claude', 'mistral', 'gemini', 'deepseek', 'llama', 'gemma', 'mixtral', 'yi-', 'ERNIE', 'command-r', 'stral', 'o1','o3','grok','sonar','r1','qwen','expe','reka','thug','toppy','mytho','airo','tulu','olmo','amazon','gigac','aion','zuki','cara','phi','beta','chat','preview','-7','-8','-1','-2','auto'];
      let modelType = 'image';
      let isFree = true;

      if (idKeywords.some(keyword => model.id.toLowerCase().includes(keyword))) {
        modelType = 'chat';
      }

      if (model.type) {
        modelType = model.type.includes('chat') ? 'chat' : 'image';
      }

      if (typeof model.is_free !== 'undefined') {
        isFree = model.is_free;
      }

      return {
        id: model.id,
        type: modelType,
        is_free: isFree,
        endpoint: model.endpoint || '/v1/chat/completions',
      };
    });
  };

  const fetchModels = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const response = await fetch(`${apiBase}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      const data = await response.json();
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid model data received');
      }
      const normalizedModels = normalizeModelData(data.data);
      setModels(normalizedModels);
      setFilteredModels(normalizedModels);
      if (normalizedModels.length > 0) {
        const defaultModel = normalizedModels.find(m => m.type === (endpoint === 'chat' ? 'chat' : 'image'));
        setModel(defaultModel ? defaultModel.id : normalizedModels[0].id);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setError('Failed to fetch models. Please check your API Base URL.');
      setModels([]);
      setFilteredModels([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase, endpoint]);

  useEffect(() => {
    if (fetchModelsTimeoutRef.current) {
      clearTimeout(fetchModelsTimeoutRef.current)
    }
    fetchModelsTimeoutRef.current = setTimeout(() => {
      fetchModels()
    }, 1000)

    return () => {
      if (fetchModelsTimeoutRef.current) {
        clearTimeout(fetchModelsTimeoutRef.current)
      }
    }
  }, [apiBase, endpoint, fetchModels])

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleApiBaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiBase(e.target.value)
    setError('')
  }

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newApiKey = e.target.value
    setApiKey(newApiKey)
    localStorage.setItem('apiKey', newApiKey)
  }

  const handleModelSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const search = e.target.value.toLowerCase()
    setModelSearch(search)
    setFilteredModels(models.filter(m => m.id.toLowerCase().includes(search) || m.type.toLowerCase().includes(search)))
  }

  const sendRequest = async (messageToSend: Message): Promise<boolean> => {
    try {
      const selectedModel = models.find(m => m.id === model)
      if (!selectedModel) {
        throw new Error('No model selected')
      }
      let url = `${apiBase}${selectedModel.endpoint}`
      url = url.replace(/v1\/v1/, 'v1')
      url = url.replace(/unf\/unf/, 'unf')
      if (!url.match(/(v1\/chat\/completions|v1\/images\/generations|unf\/chat\/completions)$/)) {
        throw new Error('Invalid endpoint URL')
      }

      const formattedMessage = endpoint === 'chat' && attachedImages.length > 0
        ? {
          role: 'user',
          content: [
            { type: 'text', text: messageToSend.content as string },
            ...attachedImages.map(img => ({
              type: 'image_url',
              image_url: img
            }))
          ]
        }
        : messageToSend

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(
          endpoint === 'chat'
            ? {
              model: model,
              messages: [...messages, formattedMessage],
            }
            : {
              model: model,
              prompt: messageToSend.content,
              n: 1,
              size: '1024x1024',
            }
        )
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || stringify(data))
      }

      if (endpoint === 'chat') {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.choices[0].message.content,
          type: 'markdown'
        }
        setMessages(prev => [...prev, assistantMessage])
        setAttachedImages([])
      } else {
        const imageMessage: Message = {
          role: 'assistant',
          content: data.data[0].url,
          type: 'image'
        }
        setMessages(prev => [...prev, imageMessage])
      }
      return true
    } catch (error) {
      console.error('Error:', error)
      setError(`Error: ${(error as Error).message}`)
      return false
    }
  }
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setLoading(true)
    setError('')
    const newMessage: Message = { role: 'user', content: prompt }

    setMessages(prev => [...prev, newMessage])

    const success = await sendRequest(newMessage)
    if (!success) {
      setMessages(prev => [...prev, { role: 'error', content: 'Failed to send message. Click to retry.' }])
    }

    setPrompt('')
    setLoading(false)
  }

  const handleRetry = async (index: number) => {
    if (index < 1 || messages[index - 1].role !== 'user') return

    setLoading(true)
    setError('')
    const messageToRetry = messages[index - 1]

    setMessages(prev => prev.slice(0, index))

    const success = await sendRequest(messageToRetry)
    if (!success) {
      setMessages(prev => [...prev, { role: 'error', content: 'Failed to send message. Click to retry.' }])
    }

    setLoading(false)
  }
  const renderMessage = (message: Message) => {
    if (message.type === 'image') {
      return <img src={message.content as string} alt="Generated image" className="max-w-full h-auto rounded" />
    }

    if (message.type === 'markdown' && typeof message.content === 'string') {
      return (
        <ReactMarkdown
          className="prose prose-invert"
          components={{
            code: ({ node, inline, className, children, ...props }: CodeProps) => {
              if (inline) {
                return <code className="bg-black/20 rounded px-1" {...props}>{children}</code>
              }
              return (
                <pre className="bg-black/20 p-4 rounded-lg overflow-x-auto">
                  <code {...props}>{children}</code>
                </pre>
              )
            }
          }}
        >
          {message.content}
        </ReactMarkdown>
      )
    }

    return <p className="break-words">{message.content as string}</p>
  }


  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <Card className="w-full max-w-5xl mx-auto backdrop-blur-xl bg-white/5 border-none shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="text-center pb-4 border-b border-white/10">
          <CardTitle className="text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center justify-center gap-3">
            <Sparkles className="h-8 w-8 text-yellow-300 animate-pulse" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              zukijourney-chat playground
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="api-base" className="text-white/90 font-medium">API Base</Label>
                <Input
                  id="api-base"
                  value={apiBase}
                  onChange={handleApiBaseChange}
                  placeholder="Enter API base URL"
                  className="bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-white/40 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key" className="text-white/90 font-medium">API Key</Label>
                <div className="relative">
                  <Input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={handleApiKeyChange}
                    placeholder="Enter API key"
                    className="bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-white/40 transition-colors pr-10"
                  />
                  {apiKey ? (
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/80" />
                  ) : (
                    <Unlock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                  )}
                </div>
              </div>
            </div>
            {error && (
              <div className="text-red-200 bg-red-500/20 p-3 rounded-lg border border-red-500/30 backdrop-blur-sm">
                {error}
              </div>
            )}
            <Tabs
              value={endpoint}
              onValueChange={(value: string) => setEndpoint(value as 'chat' | 'image')}
              className="bg-white/5 rounded-xl p-1 backdrop-blur-sm"
            >
              <TabsList className="grid grid-cols-2 gap-4 bg-transparent">
                <TabsTrigger
                  value="chat"
                  className="data-[state=active]:bg-white/20 data-[state=active]:backdrop-blur-md data-[state=active]:text-white text-white/70"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Chat
                </TabsTrigger>
                <TabsTrigger
                  value="image"
                  className="data-[state=active]:bg-white/20 data-[state=active]:backdrop-blur-md data-[state=active]:text-white text-white/70"
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Image
                </TabsTrigger>
              </TabsList>
              <TabsContent value="chat" className="mt-4 space-y-3">
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                    <Input
                      value={modelSearch}
                      onChange={handleModelSearch}
                      placeholder="Search models..."
                      className="bg-white/10 border-white/20 text-white placeholder-white/40 pl-10 focus:border-white/40 transition-colors"
                    />
                  </div>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-white/40 transition-colors">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900/95 border-white/20 text-white backdrop-blur-xl">
                      {filteredModels
                        .filter(m => m.type === 'chat')
                        .map(m => (
                          <SelectItem key={m.id} value={m.id} className="focus:bg-white/10">
                            {m.id} {m.is_free ? '(Free)' : '(Paid)'}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
              <TabsContent value="image" className="mt-4 space-y-3">
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                    <Input
                      value={modelSearch}
                      onChange={handleModelSearch}
                      placeholder="Search models..."
                      className="bg-white/10 border-white/20 text-white placeholder-white/40 pl-10 focus:border-white/40 transition-colors"
                    />
                  </div>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-white/40 transition-colors">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900/95 border-white/20 text-white backdrop-blur-xl">
                      {filteredModels
                        .filter(m => m.type === 'image')
                        .map(m => (
                          <SelectItem key={m.id} value={m.id} className="focus:bg-white/10">
                            {m.id} {m.is_free ? '(Free)' : '(Paid)'}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
            <ScrollArea
              className="h-[400px] rounded-xl p-4 bg-white/5 backdrop-blur-sm border border-white/10"
              ref={scrollAreaRef}
            >
              <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                  <motion.div
                    key={`${index}-${typeof message.content === 'string' ? message.content.substring(0, 10) : index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                  >
                    <div className={`max-w-[80%] p-4 rounded-2xl ${message.role === 'user'
                      ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg'
                      : message.role === 'error'
                        ? 'bg-gradient-to-br from-red-600 to-red-700 text-white cursor-pointer shadow-lg'
                        : 'bg-white/20 backdrop-blur-md text-white shadow-lg'
                      }`} onClick={() => message.role === 'error' && handleRetry(index)}>
                      {renderMessage(message)}
                      {attachedImages.length > 0 && message.role === 'user' && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {attachedImages.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`Attached ${idx + 1}`}
                              className="w-16 h-16 object-cover rounded-lg border border-white/20"
                            />
                          ))}
                        </div>
                      )}
                      {message.role === 'error' && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRetry(index)
                          }}
                          className="mt-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </ScrollArea>
          </div>
        </CardContent>
        <CardFooter className="p-6 border-t border-white/10">
          <form onSubmit={handleSubmit} className="flex w-full flex-col space-y-4">
            {endpoint === 'chat' && attachedImages.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                {attachedImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img}
                      alt={`Preview ${idx + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border-2 border-white/20 group-hover:border-white/40 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttachedImage(idx)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex w-full items-center gap-2">
              <Textarea
                value={prompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-white/10 border-white/20 text-white placeholder-white/40 resize-none focus:border-white/40 transition-colors rounded-xl h-12 py-2.5 min-h-[48px]"
                rows={1}
              />
              {endpoint === 'chat' && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <Button
                    type="button"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    className="h-12 w-12 bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all transform hover:scale-105 flex items-center justify-center"
                  >
                    <ImageIcon className="h-5 w-5" />
                    {attachedImages.length > 0 && (
                      <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {attachedImages.length}
                      </span>
                    )}
                  </Button>
                </>
              )}
              <Button
                type="submit"
                disabled={loading || models.length === 0}
                className={`h-12 w-12 ${endpoint === 'chat'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
                  : 'bg-gradient-to-r from-pink-600 to-red-600'
                  } text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center`}
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="h-5 w-5" />
                  </motion.div>
                ) : endpoint === 'chat' ? (
                  <Send className="h-5 w-5" />
                ) : (
                  <ImageIcon className="h-5 w-5" />
                )}
              </Button>
            </div>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}