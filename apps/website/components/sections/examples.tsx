import { FeatureSelector } from "@/components/feature-selector";
import { Section } from "@/components/section";
import { codeToHtml } from "shiki";

interface FeatureOption {
  id: number;
  title: string;
  description: string;
  code: string;
}

const featureOptions: FeatureOption[] = [
  {
    id: 1,
    title: "Implement & Review Workflow",
    description: "Automated workflow that implements a spec and reviews the implementation.",
    code: `import {
  buildSlashCommand,
  defineWorkflow,
  type CmdImplementSpecResponse,
  type CmdReviewSpecImplementationResponse,
} from "agentcmd-workflows";

export default defineWorkflow(
  {
    id: "implement-review-workflow",
    name: "Implement Review Workflow",
    description: "Implements a spec file and reviews the implementation",
    phases: [
      { id: "setup", label: "Setup" },
      { id: "implement", label: "Implement" },
      { id: "review", label: "Review" },
    ],
  },
  async ({ event, step }) => {
    const { workingDir, specFile } = event.data;

    await step.phase("implement", async () => {
      const response = await step.agent<CmdImplementSpecResponse>(
        "implement-spec",
        {
          agent: "claude",
          json: true,
          prompt: buildSlashCommand("/cmd:implement-spec", {
            specIdOrNameOrPath: specFile,
            format: "json",
          }),
          workingDir,
        }
      );

      return response;
    });

    await step.phase("review", async () => {
      const response = await step.agent<CmdReviewSpecImplementationResponse>(
        "review-spec-implementation",
        {
          agent: "claude",
          json: true,
          prompt: buildSlashCommand("/cmd:review-spec-implementation", {
            specIdOrNameOrPath: specFile,
            format: "json",
          }),
          workingDir,
        }
      );

      return response;
    });
  }
);`,
  },
  {
    id: 2,
    title: "Simple Agent Workflow",
    description: "Create a basic AI agent workflow with multiple agents.",
    code: `import { Swarm, Agent } from 'ai-agent-sdk';

const client = new Swarm();

const transferToAgentB = (): Agent => {
    return agentB;
};

const agentA = new Agent({
    name: "Agent A",
    instructions: "You are a helpful agent.",
    functions: [transferToAgentB],
});

const agentB = new Agent({
    name: "Agent B",
    instructions: "Only speak in Haikus.",
});

const run = async () => {
    const response = await client.run({
        agent: agentA,
        messages: [{ role: "user", content: "I want to talk to agent B." }],
    });
    console.log('Response:', response);
};

run();`,
  },
  {
    id: 3,
    title: "Multi-Agent Collaboration",
    description:
      "Set up multiple AI agents to work together on a complex task.",
    code: `import { Agent, MultiAgentSystem } from 'ai-agent-sdk';

const researchAgent = new Agent('Researcher');
const analysisAgent = new Agent('Analyst');
const reportAgent = new Agent('Reporter');

const system = new MultiAgentSystem('MarketResearch');

system.addAgent(researchAgent, {
  task: 'collectData',
  output: 'rawData'
});

system.addAgent(analysisAgent, {
  task: 'analyzeData',
  input: 'rawData',
  output: 'analysisResults'
});

system.addAgent(reportAgent, {
  task: 'generateReport',
  input: 'analysisResults',
  output: 'finalReport'
});

const runResearch = async () => {
  const finalReport = await system.run();
  console.log('Research completed:', finalReport);
};

runResearch();`,
  },
  {
    id: 4,
    title: "Tool Integration",
    description: "Integrate external tools and APIs into an AI agent workflow.",
    code: `import { Agent, Tool } from 'ai-agent-sdk';
import { Configuration, OpenAIApi } from 'openai';

const agent = new Agent('ResearchAssistant');

const openaiTool = new Tool('OpenAI', {
  action: async (prompt: string) => {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);
    const response = await openai.createCompletion({
      model: "text-davinci-002",
      prompt,
    });
    return response.data.choices[0].text;
  }
});

const searchTool = new Tool('GoogleSearch', {
  action: async (query: string) => {
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.append('key', process.env.GOOGLE_API_KEY);
    url.searchParams.append('cx', process.env.GOOGLE_SEARCH_ENGINE_ID);
    url.searchParams.append('q', query);

    const response = await fetch(url);
    const data = await response.json();
    return data.items.slice(0, 5);
  }
});

agent.addTool(openaiTool);
agent.addTool(searchTool);

const performResearch = async (topic: string) => {
  const researchResult = await agent.performResearch(topic);
  console.log('Research results:', researchResult);
};

performResearch('AI advancements in 2023');`,
  },
  {
    id: 5,
    title: "Customizable Agent Behavior",
    description:
      "Design a specialized AI agent with custom decision-making logic.",
    code: `import { Agent, KnowledgeBase } from 'ai-agent-sdk';

class CustomerSupportAgent extends Agent {
  private knowledgeBase: KnowledgeBase;

  constructor(name: string) {
    super(name);
    this.knowledgeBase = new KnowledgeBase('support-docs.json');
  }

  async decideAction(input: string): Promise<string> {
    if (this.isSimpleQuery(input)) {
      return this.provideDirectAnswer(input);
    } else if (this.needsEscalation(input)) {
      return this.escalateToHuman(input);
    } else {
      return this.generateDetailedResponse(input);
    }
  }

  private isSimpleQuery(input: string): boolean {
    // Custom logic to determine if the query is simple
    return input.split(' ').length < 5;
  }

  private needsEscalation(input: string): boolean {
    // Custom logic to decide if human intervention is needed
    return input.toLowerCase().includes('urgent') || input.toLowerCase().includes('complaint');
  }

  private async provideDirectAnswer(input: string): Promise<string> {
    return this.knowledgeBase.getQuickAnswer(input);
  }

  private async escalateToHuman(input: string): Promise<string> {
    // Logic to forward the query to a human support agent
    return "Your query has been escalated to our human support team. They will contact you shortly.";
  }

  private async generateDetailedResponse(input: string): Promise<string> {
    // Use AI to generate a detailed response
    return this.generateResponse(input);
  }
}

const handleCustomerQuery = async (query: string) => {
  const supportAgent = new CustomerSupportAgent('HelpDesk');
  const response = await supportAgent.handleQuery(query);
  console.log('Agent response:', response);
};

handleCustomerQuery("How do I reset my password?");`,
  },
];

export async function Examples() {
  const features = await Promise.all(
    featureOptions.map(async (feature) => ({
      ...feature,
      code: await codeToHtml(feature.code, {
        lang: "typescript",
        theme: "github-dark",
      }),
    }))
  );

  return (
    <Section id="examples">
      <div className="border-x border-t">
        <FeatureSelector features={features} />
      </div>
    </Section>
  );
}
