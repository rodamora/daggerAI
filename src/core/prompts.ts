export const SQUAD_PROMPTS = {
  observation: '\nObservation:',
  memory: 'This is the summary of your work so far:\n{chat_history}',
  rolePlaying: 'You are {role}. {backstory}\nYour goal is: {goal}\n\n',
  task: '\nCurrent Task: {input}\n',
  tools:
    'You ONLY have access to the following tools, and should NEVER make up tools that are not listed here:\n\n{tools}\n\nUse the following format for your work:\n\nThought: you should always think about what to do\nAction: the action to take, only one name of {toolNames}, just the name, exactly as it\'s written.\nAction Input: the input to the action, just a simple JSON object " to wrap keys and values.\nObservation: the result of the action\n\nIMPORTANT: Once all necessary information is gathered you output:\n\nThought: I now know the final answer.\nFinal Answer: the final answer to the original input question.\nYou ALWAYS output in english, except the content of the Final Answer.\n',
  noTools:
    'To give my best complete final answer to the task use the exact following format:\n\nThought: I now can give a great answer\nFinal Answer: my best complete final answer to the task.\nYour final answer must be the great and the most complete as possible, it must be outcome described.\n\nI MUST use these formats, my job depends on it!\n\n',
  finalAnswerFormat:
    "If you don't need to use any more tools, you must give your best complete final answer, make sure it satisfy the expect criteria, use the EXACT format below:\n\nThought: I now can give a great answer\nFinal Answer: my best complete final answer to the task.\n\n",
  formatWithoutTools:
    "\nSorry, I didn't use the right format. I MUST either use a tool (among the available ones), OR give my best final answer.\nI just remembered the expected format I must follow:\n\nQuestion: the input question you must answer\nThought: you should always think about what to do\nAction: the action to take, should be one of [{tool_names}]\nAction Input: the input to the action\nObservation: the result of the action\n... (this Thought/Action/Action Input/Observation can repeat N times)\nThought: I now can give a great answer\nFinal Answer: my best complete final answer to the task\nYour final answer must be the great and the most complete as possible, it must be outcome described\n\n",
  format:
    'I MUST either use a tool (use one at time) OR give my best final answer. To Use the following format:\n\nThought: you should always think about what to do\nAction: the action to take, should be one of [{toolNames}]\nAction Input: the input to the action, dictionary\nObservation: the result of the action\n... (this Thought/Action/Action Input/Observation can repeat N times)\nThought: I now can give a great answer\nFinal Answer: my best complete final answer to the task.\nYour final answer must be the great and the most complete as possible, it must be outcome described\n\n ',
  taskWithContext: "\n\nThis is the context you're working with:\n{context}",
  expectedOutput:
    '\nYour Final Answer output is expected to follow these conditions: {expectedOutput}. Remember: You MUST return the actual complete content as the final answer (and not just a summary). Use this format Final Answer: complete content following the conditions.',
  kickoff:
    '\n\nBegin! This is VERY important to you, use the tools available and give your best Final Answer, your job depends on it!\n',
} as const
