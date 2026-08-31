import type { APIRoute } from 'astro';
import { SITE } from '../config/site';

/**
 * Robots policy per the strategy plan: search and answer-engine crawlers are
 * welcomed; model-training crawlers (GPTBot, ClaudeBot) are governed by the
 * flip-able flags in SITE.robots (LAUNCH-CHECKLIST item 6).
 */
const SEARCH_CRAWLERS = [
  'OAI-SearchBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Googlebot',
  'Bingbot',
] as const;

const TRAINING_CRAWLERS = [
  { agent: 'GPTBot', allowed: SITE.robots.allowGPTBot },
  { agent: 'ClaudeBot', allowed: SITE.robots.allowClaudeBot },
] as const;

export const GET: APIRoute = () => {
  const blocks: string[] = [];
  for (const agent of SEARCH_CRAWLERS) {
    blocks.push(`User-agent: ${agent}\nAllow: /`);
  }
  for (const { agent, allowed } of TRAINING_CRAWLERS) {
    blocks.push(`User-agent: ${agent}\n${allowed ? 'Allow' : 'Disallow'}: /`);
  }
  blocks.push('User-agent: *\nAllow: /');

  const body = `${blocks.join('\n\n')}\n\nSitemap: ${SITE.domain}/sitemap.xml\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
