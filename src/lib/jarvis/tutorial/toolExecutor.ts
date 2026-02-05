/**
 * Tutorial Tool Executor
 *
 * Executes tutorial-related tools called by Claude.
 */

import { getTutorialManager } from './TutorialManager';
import { TutorialToolResult } from './tutorialTools';
import { TUTORIAL_SEQUENCE } from './modules';
import { CURRICULUM_CLUSTERS } from '../notion/notionUrls';
import { getLessonsForCluster, LESSON_REGISTRY } from '../curriculum/lessonRegistry';

/**
 * Execute a tutorial tool
 */
export async function executeTutorialTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<TutorialToolResult> {
  const manager = getTutorialManager();

  switch (toolName) {
    case 'start_tutorial': {
      const moduleId = input.module_id as string | undefined;
      const forceRestart = input.force_restart === 'true';

      const result = manager.startTutorial(
        moduleId as any,
        forceRestart
      );

      if (!result.success) {
        return {
          success: false,
          error: result.message
        };
      }

      const content = manager.generateVoiceContent(result.module!);
      return {
        success: true,
        content,
        module: {
          id: result.module!.id,
          title: result.module!.title
        }
      };
    }

    case 'teach_topic': {
      const topic = input.topic as string;

      const result = manager.teachTopic(topic);

      if (!result.success) {
        return {
          success: false,
          error: result.message
        };
      }

      const content = manager.generateVoiceContent(result.module!);
      return {
        success: true,
        content,
        module: {
          id: result.module!.id,
          title: result.module!.title
        }
      };
    }

    case 'continue_tutorial': {
      const currentModule = manager.getCurrentModule();
      if (!currentModule) {
        // No active tutorial, start from next incomplete
        const result = manager.startTutorial();
        if (!result.success) {
          return {
            success: false,
            error: result.message || 'No tutorial in progress and no modules left.'
          };
        }
        const content = manager.generateVoiceContent(result.module!);
        return {
          success: true,
          content,
          module: {
            id: result.module!.id,
            title: result.module!.title
          }
        };
      }

      // Try to advance to next section
      const nextResult = manager.nextSection();

      if (nextResult.hasMore && nextResult.section) {
        // More sections in current module
        let content = nextResult.section.content;
        if (nextResult.section.examples?.length) {
          content += `\n\nExamples:\n${nextResult.section.examples.map(e => `- "${e}"`).join('\n')}`;
        }
        return {
          success: true,
          content,
          module: {
            id: currentModule.id,
            title: currentModule.title
          }
        };
      }

      // Module complete, move to next
      const completion = manager.completeCurrentModule();

      if (completion.tutorialComplete) {
        return {
          success: true,
          content: "That's the end of the tutorial! You now know how to use Jarvis. Just talk to me naturally, and we'll figure out the rest together.\n\nSay 'quick reference' anytime for a command cheat sheet."
        };
      }

      // Start next module
      const nextModuleResult = manager.startTutorial(completion.nextModule!.id);
      const content = manager.generateVoiceContent(nextModuleResult.module!);
      return {
        success: true,
        content: `Great, you've completed ${currentModule.title}!\n\nLet's move on.\n\n${content}`,
        module: {
          id: nextModuleResult.module!.id,
          title: nextModuleResult.module!.title
        }
      };
    }

    case 'skip_tutorial_module': {
      const currentModule = manager.getCurrentModule();
      if (!currentModule) {
        return {
          success: false,
          error: 'No tutorial module in progress to skip.'
        };
      }

      const moduleName = currentModule.title;
      manager.skipCurrentModule();

      const progress = manager.getProgress();
      const nextModule = manager.startTutorial();

      if (!nextModule.success) {
        return {
          success: true,
          content: `Skipped ${moduleName}. That was the last module - you're all set! Say 'quick reference' for a command cheat sheet.`
        };
      }

      return {
        success: true,
        content: `Skipped ${moduleName}. Moving on to ${nextModule.module!.title}.\n\n${manager.generateVoiceContent(nextModule.module!)}`
      };
    }

    case 'get_tutorial_progress': {
      const progress = manager.getProgress();
      const completed = progress.completedModules.length;
      const total = TUTORIAL_SEQUENCE.length;
      const percent = Math.round((completed / total) * 100);

      const completedList = progress.completedModules.length > 0
        ? progress.completedModules.join(', ')
        : 'None yet';

      const remaining = TUTORIAL_SEQUENCE.filter(
        m => !progress.completedModules.includes(m)
      );
      const remainingList = remaining.length > 0
        ? remaining.join(', ')
        : 'All complete!';

      return {
        success: true,
        content: `Tutorial Progress: ${percent}% complete (${completed}/${total} modules)\n\nCompleted: ${completedList}\n\nRemaining: ${remainingList}\n\nSay 'continue tutorial' to pick up where you left off.`,
        progress: {
          completedModules: progress.completedModules,
          currentModule: progress.currentModule,
          percentComplete: percent
        }
      };
    }

    case 'get_quick_reference': {
      const reference = manager.getQuickReference();
      return {
        success: true,
        content: reference
      };
    }

    case 'get_curriculum_status': {
      const clusterFilter = input.cluster as string | undefined;

      const clusters = clusterFilter
        ? CURRICULUM_CLUSTERS.filter((c) => c.id === clusterFilter)
        : CURRICULUM_CLUSTERS;

      const lines: string[] = ['Your Notion Life OS Curriculum:\n'];

      for (const cluster of clusters) {
        const lessons = getLessonsForCluster(cluster.id);
        lines.push(`${cluster.icon} ${cluster.label} (${lessons.length} lessons)`);
        for (const lesson of lessons) {
          lines.push(`  - ${lesson.title}: ${lesson.description}`);
        }
        lines.push('');
      }

      lines.push(`Total: ${LESSON_REGISTRY.length} lessons across ${CURRICULUM_CLUSTERS.length} clusters.`);
      lines.push('\nSay "teach me about [topic]" to start any lesson.');

      return {
        success: true,
        content: lines.join('\n'),
      };
    }

    default:
      return {
        success: false,
        error: `Unknown tutorial tool: ${toolName}`
      };
  }
}

/**
 * Check if a tool name is a tutorial tool
 */
export function isTutorialTool(toolName: string): boolean {
  return [
    'start_tutorial',
    'teach_topic',
    'continue_tutorial',
    'skip_tutorial_module',
    'get_tutorial_progress',
    'get_quick_reference',
    'get_curriculum_status',
  ].includes(toolName);
}
