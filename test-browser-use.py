import asyncio
from browser_use import Agent
from browser_use.llm.google.chat import ChatGoogle

async def main():
    agent = Agent(
        task="Go to github.com/browser-use/browser-use and tell me how many stars it has and what it does in one sentence",
        llm=ChatGoogle(model='gemini-2.0-flash'),
    )
    result = await agent.run()
    print("Result:", result.final_result())

if __name__ == "__main__":
    asyncio.run(main())
