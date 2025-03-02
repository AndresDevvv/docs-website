'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, List, Moon, Sun, Check, Info } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from 'next-themes';

interface Model {
  id: string;
  object: string;
  owned_by: string;
  endpoint: string;
  is_free: boolean;
  is_early_access: boolean;
  context_window: number;
  max_output: number;
  pricing: {
    price: string | number;
    multiplier: number;
  };
  voices?: string[];
}

interface ModelDetailsProps {
  model: Model;
  isOpen: boolean;
  onClose: () => void;
}

interface ModelCardProps {
  model: Model;
  onClick: () => void;
}

interface FilterState {
  isFree: boolean;
  hasVision: boolean;
  isRoleplay: boolean;
}

interface FilterButtonsProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
}

const TokenSystemInfo: React.FC = () => (
  <Card className="p-4 mb-6 border border-purple-500/20">
    <div className="flex items-center gap-2 mb-2">
      <Info className="h-5 w-5 text-purple-400" />
      <h3 className="font-semibold">Understanding Token Pricing</h3>
    </div>
    <p className="text-sm text-muted-foreground">
      ZukiJourney provides daily token grants. For chat models, 1 ZJ token = 1 OpenAI token.
      The total cost is calculated as (prompt tokens + completion tokens) × model multiplier,
      which is then deducted from your daily grant. Image and audio models use fixed credit costs per request.
    </p>
  </Card>
);

const TokenSystemInfoCompact: React.FC = () => (
  <div className="text-sm text-muted-foreground border-l-2 border-purple-500/20 pl-3 mt-2">
    <p>1 ZJ token = 1 OpenAI token for chat models. Costs are calculated as (prompt + completion) × multiplier.</p>
  </div>
);

const FilterButtons: React.FC<FilterButtonsProps> = ({ filters, onFilterChange }) => (
  <div className="flex flex-wrap gap-2">
    <Button
      variant={filters.isFree ? "secondary" : "outline"}
      onClick={() => onFilterChange({ ...filters, isFree: !filters.isFree })}
      className="text-sm"
    >
      Free Models
    </Button>
  </div>
);
const useModelIcon = (model: Model): string => {
  return getModelIcon(model);
};

const getModelIcon = (model: Model): string => {
  if (model.owned_by === 'zukijourney') {
    return 'https://avatars.githubusercontent.com/u/169627354?s=200&v=4';
  }

  // Add mappings for other providers
  const providerIcons: { [key: string]: string } = {
    'openai': 'https://avatars.githubusercontent.com/u/14957082?s=200&v=4',
    'anthropic': 'https://avatars.githubusercontent.com/u/76263028?s=200&v=4',
    'google': 'https://avatars.githubusercontent.com/u/1342004?s=200&v=4',
    'xAI': 'https://avatars.githubusercontent.com/u/50278?s=200&v=4',
    'nu': 'https://avatars.githubusercontent.com/u/50278?s=200&v=4',
    'cohere': 'https://avatars.githubusercontent.com/u/54850923?s=200&v=4',
    'mistralai': 'https://avatars.githubusercontent.com/u/132372032?s=200&v=4',
    'reka': 'https://avatars.githubusercontent.com/u/109515370?s=200&v=4',
    '01ai': 'https://avatars.githubusercontent.com/u/139308978?s=200&v=4',
    'jondurbin': 'https://cdn-avatars.huggingface.co/v1/production/uploads/6453dafca647b92069ac541a/QkUleoJtHHdTkqtW54QIG.jpeg',
    'microsoft': 'https://avatars.githubusercontent.com/u/6154722?s=200&v=4',
    'meta': 'https://avatars.githubusercontent.com/u/69631?s=200&v=4',
    'liquidai': 'https://avatars.githubusercontent.com/u/134113674?s=200&v=4',
    'yandex': 'https://avatars.githubusercontent.com/u/7409213?s=200&v=4',
    'sberbank': 'https://avatars.githubusercontent.com/u/60739030?s=200&v=4',
    'alibaba': 'https://avatars.githubusercontent.com/u/141221163?s=200&v=4',
    'deepseek': 'https://avatars.githubusercontent.com/u/148330874?s=200&v=4',
    'inflection': 'https://avatars.githubusercontent.com/u/101123883?s=200&v=4',
    'nvidia': 'https://avatars.githubusercontent.com/u/1728152?s=200&v=4',
    'gryphe': 'https://cdn-avatars.huggingface.co/v1/production/uploads/64ae4107ad6218d51a2a7d0c/3dcor68aYBKEcTlOUHJpK.png',
    'undi95': 'https://cdn-avatars.huggingface.co/v1/production/uploads/63ab1241ad514ca8d1430003/d-43TcOxG-zqAbzrH2m7H.png',
    'perplexity': 'https://avatars.githubusercontent.com/u/185426709?s=200&v=4',
    'neversleep': 'https://cdn-avatars.huggingface.co/v1/production/uploads/63ab1241ad514ca8d1430003/hgUQO4ePAX_IzCVXq59An.jpeg',
    'jamba': 'https://cdn-avatars.huggingface.co/v1/production/uploads/65e60c0ed5313c06372446ff/QwehUHgP2HtVAMW5MzJ2j.png',
    'redpanda': 'https://avatars.githubusercontent.com/u/266009?v=4',
    'midjourney': 'https://avatars.githubusercontent.com/u/61396273?s=200&v=4',
    'black-forest-labs': 'https://avatars.githubusercontent.com/u/164064024?s=200&v=4',
    'stability-ai': 'https://avatars.githubusercontent.com/u/100950301?s=200&v=4',
    'playgroundai': 'https://avatars.githubusercontent.com/u/113217150?s=200&v=4',
    'pollinationsai': 'https://avatars.githubusercontent.com/u/86964862?s=200&v=4',
    'prodia': 'https://avatars.githubusercontent.com/u/42473139?s=200&v=4',
    'suno': 'https://avatars.githubusercontent.com/u/99442120?s=200&v=4',
    'elevenlabs': 'https://avatars.githubusercontent.com/u/94471909?s=200&v=4',
    'speechify': 'https://avatars.githubusercontent.com/u/32529485?s=200&v=4',
    'mixedbread': 'https://avatars.githubusercontent.com/u/153227975?s=200&v=4',
    'https://arxiv.org/abs/2105.09750': 'https://avatars.githubusercontent.com/u/45442578?s=200&v=4',
    'amazon': 'https://avatars.githubusercontent.com/u/105071691?s=200&v=4',
    'minimax': 'https://filecdn.minimax.chat/public/969d635c-cab6-45cc-8d61-47c9fe40c81f.png?x-oss-process=image/format,webp',
    'iflytek': 'https://avatars.githubusercontent.com/u/26786495?s=200&v=4',
    'tsinghua': 'https://avatars.githubusercontent.com/u/23359141?s=200&v=4',
    'moonshot': 'https://avatars.githubusercontent.com/u/129152888?s=200&v=4',
    'xai': 'https://avatars.githubusercontent.com/u/129152888?s=200&v=4'
  };

  return providerIcons[model.owned_by] || 'https://avatars.githubusercontent.com/u/314135?s=200&v=4';
};

const getModelType = (type: string): string => {
  const types: Record<string, string> = {
    '/v1/chat/completions': 'Text Generation',
    '/v1/audio/speech': 'Text-to-Speech',
    '/v1/embeddings': 'Embeddings',
    '/v1/images/upscale': 'Image Upscaling',
    '/v1/text/translations': 'Text Translation',
    '/v1/audio/translations': 'Audio Translation',
    '/v1/audio/transcriptions': 'Speech to Text',
    '/v1/images/generations': 'Image Generation',
  };
  return types[type] || type;
};

const formatPricing = (model: Model): string => {
  if (typeof model.pricing.price === 'string' && model.pricing.price === 'per_token') {
    return `${model.pricing.multiplier}x per token`;
  }
  return `${model.pricing.price} tokens per request`;
};

const ModelDetails: React.FC<ModelDetailsProps> = ({ model, isOpen, onClose }) => {
  const iconUrl = useModelIcon(model);

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-background">
        <DialogHeader>
          <DialogTitle>{model.id}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Image
              src={iconUrl}
              alt={model.id}
              width={64}
              height={64}
              className="rounded-xl col-span-1"
            />
            <div className="col-span-3">
              <p className="text-sm text-muted-foreground">Owner: {model.owned_by}</p>
              <p className="text-sm text-muted-foreground">Type: {getModelType(model.endpoint)}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {model.is_free ? (
                  <Badge variant="outline">Available to Everyone</Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted">Donators/Subscribers only!</Badge>
                )}
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium">Pricing</h4>
            <p className="text-sm">{formatPricing(model)}</p>
            {model.endpoint.includes('chat') && (
              <p className="text-sm">Context Window: {model.context_window}, Max Output Tokens: {model.max_output}</p>
            )}
            <TokenSystemInfoCompact />
          </div>
          {model.voices && (
            <div>
              <h4 className="font-medium">Available Voices</h4>
              <p className="text-sm max-h-32 overflow-y-auto">{model.voices}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
const ModelCard: React.FC<ModelCardProps> = ({ model, onClick }) => {
  const iconUrl = useModelIcon(model);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="group"
      onClick={onClick}
    >
      <Card className="p-4 bg-card hover:bg-card/80 transition-all cursor-pointer relative">
        <div className="flex items-center gap-4">
          <Image
            src={iconUrl}
            alt={model.id}
            width={40}
            height={40}
            className="rounded-xl"
          />
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{model.id}</h3>
            <div className="flex flex-wrap gap-2 my-1">
              {model.owned_by === 'zukijourney' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Check className="h-3 w-3" /> Made by ZukiJourney
                </Badge>
              )}
              {model.is_free && (
                <Badge variant="secondary">Available to everyone!</Badge>
              )}
              {model.is_early_access && (
                <Badge variant="secondary">Early Access</Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {getModelType(model.endpoint)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatPricing(model)}
            </div>
            {model.endpoint.includes('chat') && (
              <div className="text-xs text-muted-foreground mt-1">
                Context Window: {model.context_window}, Max Output Tokens: {model.max_output}
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default function ModelsPage(): JSX.Element {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [sortBy, setSortBy] = useState<string>('default');
  const [filterType, setFilterType] = useState<string>('all');
  const [filters, setFilters] = useState<FilterState>({
    isFree: false,
    hasVision: false,
    isRoleplay: false
  });
  const { theme, setTheme } = useTheme();

  // Add this interface for the API response
  interface ApiResponse {
    data: Model[];
    unfModels: Model[];
    error?: string;
  }

  useEffect(() => {
    const fetchModels = async (): Promise<void> => {
      try {
        const response = await fetch('/api/model-list');
        const data = await response.json() as ApiResponse;
        if (!response.ok) throw new Error(data.error || 'Failed to fetch models');
        // Now TypeScript knows these are Model arrays
        const uniqueModels = Array.from(
          new Map(data.data.map((model: Model) => [model.id, model])).values()
        );
        setModels(uniqueModels);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch models');
      } finally {
        setIsLoading(false);
      }
    };

    fetchModels();
  }, []);


  const sortModels = (modelList: Model[]): Model[] => {
    const zukiModels = modelList.filter(model => model.owned_by === 'zukijourney');
    const otherModels = modelList.filter(model => model.owned_by !== 'zukijourney');

    const sortedOtherModels = [...otherModels].sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          const priceA = typeof a.pricing.price === 'number' ? a.pricing.price : a.pricing.multiplier;
          const priceB = typeof b.pricing.price === 'number' ? b.pricing.price : b.pricing.multiplier;
          return priceA - priceB;
        case 'price-desc':
          const priceC = typeof a.pricing.price === 'number' ? a.pricing.price : a.pricing.multiplier;
          const priceD = typeof b.pricing.price === 'number' ? b.pricing.price : b.pricing.multiplier;
          return priceD - priceC;
        case 'name-asc':
          return a.id.localeCompare(b.id);
        case 'name-desc':
          return b.id.localeCompare(a.id);
        default:
          return 0;
      }
    });

    return [...zukiModels, ...sortedOtherModels];
  };

  const filteredModels = models.filter(model => {
    const matchesSearch = model.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || model.endpoint === filterType;
    const matchesFilters = (
      (!filters.isFree || model.is_free)
    );
    return matchesSearch && matchesType && matchesFilters;
  });

  const sortedAndFilteredModels = sortModels(filteredModels);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 bg-red-50 border-red-200">
          <h3 className="text-red-800 font-semibold">Error Loading Models</h3>
          <p className="text-red-600">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      <div className="container mx-auto p-4 space-y-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text">
            ZukiJourney Models
          </h1>
          <p className="text-xl text-muted-foreground">
            Browse our available AI models and their capabilities
          </p>
        </div>

        <TokenSystemInfo />

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              className="pl-10 bg-background"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select onValueChange={setSortBy} defaultValue="default">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="name-asc">Name: A to Z</SelectItem>
              <SelectItem value="name-desc">Name: Z to A</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={setFilterType} defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="/v1/chat/completions">Chat Completions</SelectItem>
              <SelectItem value="/v1/images/generations">Image Generation</SelectItem>
              <SelectItem value="/v1/audio/speech">Text to Speech</SelectItem>
              <SelectItem value="/v1/text/translations">Text Translation</SelectItem>
              <SelectItem value="/v1/embeddings">Embeddings</SelectItem>
              <SelectItem value="/v1/images/upscale">Image Upscaling</SelectItem>
            </SelectContent>
          </Select>

          <FilterButtons
            filters={filters}
            onFilterChange={setFilters}
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedAndFilteredModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              onClick={() => setSelectedModel(model)}
            />
          ))}
        </div>

        {selectedModel && (
          <ModelDetails
            model={selectedModel}
            isOpen={!!selectedModel}
            onClose={() => setSelectedModel(null)}
          />
        )}
      </div>
    </div>
  );
}