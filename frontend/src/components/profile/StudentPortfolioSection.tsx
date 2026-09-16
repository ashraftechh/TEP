import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Code2, Compass, Award, Globe2, Plus, X } from 'lucide-react';
import { type ProfileSkill } from '@/types/profile';
import { type SkillItem } from '@/store/slices/lookupSlice';

interface StudentPortfolioSectionProps {
  isEditing: boolean;
  skills: ProfileSkill[];
  availableSkills: SkillItem[];
  interests: string[];
  languages: string[];
  achievements: string[];
  onAddInterest: (item: string) => void;
  onRemoveInterest: (index: number) => void;
  onAddLanguage: (item: string) => void;
  onRemoveLanguage: (index: number) => void;
  onAddAchievement: (item: string) => void;
  onRemoveAchievement: (index: number) => void;
  onAttachSkill: (skillId: number, proficiency: string) => void;
  onDetachSkill: (skillId: number) => void;
  isSkillLoading?: boolean;
}

export const StudentPortfolioSection: React.FC<StudentPortfolioSectionProps> = ({
  isEditing,
  skills,
  availableSkills,
  interests,
  languages,
  achievements,
  onAddInterest,
  onRemoveInterest,
  onAddLanguage,
  onRemoveLanguage,
  onAddAchievement,
  onRemoveAchievement,
  onAttachSkill,
  onDetachSkill,
  isSkillLoading = false,
}) => {
  const { t, i18n } = useTranslation(['profile', 'auth']);
  const isArabic = i18n.language === 'ar';

  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [selectedProficiency, setSelectedProficiency] = useState<string>('intermediate');
  const [interestInput, setInterestInput] = useState<string>('');
  const [languageInput, setLanguageInput] = useState<string>('');
  const [achievementInput, setAchievementInput] = useState<string>('');

  const getLocalizedName = (name: string | { ar?: string; en?: string } | undefined) => {
    if (!name) return '';
    if (typeof name === 'string') return name;
    return isArabic ? name.ar || name.en || '' : name.en || name.ar || '';
  };

  const handleAttachSkillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkillId) return;
    onAttachSkill(Number(selectedSkillId), selectedProficiency);
    setSelectedSkillId('');
  };

  const handleAddInterestKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (interestInput.trim()) {
        onAddInterest(interestInput.trim());
        setInterestInput('');
      }
    }
  };

  const handleAddLanguageKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (languageInput.trim()) {
        onAddLanguage(languageInput.trim());
        setLanguageInput('');
      }
    }
  };

  const handleAddAchievementKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (achievementInput.trim()) {
        onAddAchievement(achievementInput.trim());
        setAchievementInput('');
      }
    }
  };

  // Filter out already attached skills from available skills list
  const unattachedSkills = availableSkills.filter(
    (available) => !skills.some((attached) => attached.id === available.id)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Skills Card */}
        <Card className="bg-surface border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Code2 className="h-5 w-5 text-university-primary" />
              {t('profile.skills')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {skills.length === 0 ? (
                <p className="text-xs text-foreground-muted italic">{t('profile.emptyState')}</p>
              ) : (
                skills.map((skill) => (
                  <Badge
                    key={skill.id}
                    variant="secondary"
                    className="flex items-center gap-1.5 py-1 px-2.5 text-xs bg-surface-secondary border border-border"
                  >
                    <span>{getLocalizedName(skill.name)}</span>
                    {skill.proficiency && (
                      <span className="text-[10px] text-foreground-muted bg-surface/80 dark:bg-surface-hover px-1.5 py-0.5 rounded font-normal">
                        {t(`profile.proficiencies.${skill.proficiency}`, skill.proficiency)}
                      </span>
                    )}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => onDetachSkill(skill.id)}
                        disabled={isSkillLoading}
                        aria-label={`Remove skill ${getLocalizedName(skill.name)}`}
                        className="text-foreground-muted hover:text-error cursor-pointer transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))
              )}
            </div>

            {isEditing && (
              <form
                onSubmit={handleAttachSkillSubmit}
                className="pt-2 border-t border-border space-y-2"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue placeholder={t('profile.selectSkill')}>
                          {selectedSkillId
                            ? getLocalizedName(
                                availableSkills.find((s) => String(s.id) === selectedSkillId)?.name
                              )
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {unattachedSkills.map((skill) => (
                          <SelectItem key={skill.id} value={String(skill.id)} className="text-xs">
                            {getLocalizedName(skill.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Select value={selectedProficiency} onValueChange={setSelectedProficiency}>
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue placeholder={t('profile.proficiency')}>
                          {selectedProficiency
                            ? t(`profile.proficiencies.${selectedProficiency}`, selectedProficiency)
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner" className="text-xs">
                          {t('profile.proficiencies.beginner')}
                        </SelectItem>
                        <SelectItem value="intermediate" className="text-xs">
                          {t('profile.proficiencies.intermediate')}
                        </SelectItem>
                        <SelectItem value="advanced" className="text-xs">
                          {t('profile.proficiencies.advanced')}
                        </SelectItem>
                        <SelectItem value="expert" className="text-xs">
                          {t('profile.proficiencies.expert')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={!selectedSkillId || isSkillLoading}
                  className="w-full text-xs h-8 cursor-pointer border-university-primary/30 text-university-primary hover:bg-university-primary/10"
                >
                  <Plus className="w-3.5 h-3.5 ltr:mr-1 rtl:ml-1" />
                  {t('profile.addSkill')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Interests Card */}
        <Card className="bg-surface border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Compass className="h-5 w-5 text-university-primary" />
              {t('profile.interests')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {interests.length === 0 ? (
                <p className="text-xs text-foreground-muted italic">{t('profile.emptyState')}</p>
              ) : (
                interests.map((interest, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="flex items-center gap-1.5 py-1 px-2.5 text-xs border-border bg-surface"
                  >
                    <span>{interest}</span>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => onRemoveInterest(index)}
                        aria-label={`Remove interest ${interest}`}
                        className="text-foreground-muted hover:text-error cursor-pointer transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))
              )}
            </div>

            {isEditing && (
              <div className="flex gap-2 pt-2 border-t border-border">
                <Input
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={handleAddInterestKey}
                  placeholder={t('profile.addInterest')}
                  className="text-xs h-9"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (interestInput.trim()) {
                      onAddInterest(interestInput.trim());
                      setInterestInput('');
                    }
                  }}
                  className="text-xs h-9 px-3 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Languages Card */}
        <Card className="bg-surface border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Globe2 className="h-5 w-5 text-university-primary" />
              {t('profile.languages')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {languages.length === 0 ? (
                <p className="text-xs text-foreground-muted italic">{t('profile.emptyState')}</p>
              ) : (
                languages.map((lang, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface-secondary/40 text-xs font-medium"
                  >
                    <span>{lang}</span>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => onRemoveLanguage(index)}
                        aria-label={`Remove language ${lang}`}
                        className="text-foreground-muted hover:text-error cursor-pointer transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {isEditing && (
              <div className="flex gap-2 pt-2 border-t border-border">
                <Input
                  value={languageInput}
                  onChange={(e) => setLanguageInput(e.target.value)}
                  onKeyDown={handleAddLanguageKey}
                  placeholder={t('profile.addLanguage')}
                  className="text-xs h-9"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (languageInput.trim()) {
                      onAddLanguage(languageInput.trim());
                      setLanguageInput('');
                    }
                  }}
                  className="text-xs h-9 px-3 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Achievements Card */}
        <Card className="bg-surface border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Award className="h-5 w-5 text-amber-500" />
              {t('profile.achievements')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {achievements.length === 0 ? (
                <p className="text-xs text-foreground-muted italic">{t('profile.emptyState')}</p>
              ) : (
                achievements.map((achievement, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between gap-2 p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-foreground font-medium">{achievement}</span>
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => onRemoveAchievement(index)}
                        aria-label={`Remove achievement ${achievement}`}
                        className="text-foreground-muted hover:text-error cursor-pointer transition-colors shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {isEditing && (
              <div className="flex gap-2 pt-2 border-t border-border">
                <Input
                  value={achievementInput}
                  onChange={(e) => setAchievementInput(e.target.value)}
                  onKeyDown={handleAddAchievementKey}
                  placeholder={t('profile.addAchievement')}
                  className="text-xs h-9"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (achievementInput.trim()) {
                      onAddAchievement(achievementInput.trim());
                      setAchievementInput('');
                    }
                  }}
                  className="text-xs h-9 px-3 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
