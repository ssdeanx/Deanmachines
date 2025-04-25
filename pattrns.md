```ts
// Using the ai package's generateText function with google model
      const result = await generateText({
        model: google("models/gemini-2.0-flash"),
        prompt: `
        You are an evaluator for research documents. Rate the following document on a scale of 1-10 for:
        1. Accuracy (factual correctness)
        2. Completeness (covers all aspects of the topic)
        3. Clarity (easy to understand)

        Also provide brief comments on what could be improved.

        QUERY: ${documentData.query}
        DOCUMENT: ${documentData.document}

        Return ONLY valid JSON with this structure:
        {
          "accuracy": 7,
          "completeness": 8,
          "clarity": 9,
          "comments": "Brief feedback comments here"
        }
      `,
      });

      // The result structure from generateText() is different
      const feedbackText = result.text;
      let feedback;

      try {
        // Extract JSON from the response
        const jsonMatch = feedbackText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          feedback = JSON.parse(jsonMatch[0]);
        } else {
          // Default feedback if parsing fails
          feedback = {
            accuracy: 7,
            completeness: 7,
            clarity: 7,
            comments: "Unable to parse specific feedback",
          };
        }
      } catch (jsonError) {
        console.error("Error parsing feedback:", jsonError);
        feedback = {
          accuracy: 7,
          completeness: 7,
          clarity: 7,
          comments: "Error occurred during feedback generation",
        };
      }

      // Store feedback in memory for reinforcement learning
      try {
        // Create a unique thread for storing this feedback entry
        const feedbackThreadId = `feedback_${documentData.timestamp.replace(
          /[^a-zA-Z0-9]/g,
          ""
        )}`;
        const feedbackResourceId = `feedback_resource_${documentData.query
          .replace(/\s+/g, "_")
          .toLowerCase()}`;

        // Store feedback as metadata on a new thread
        await memory.createThread({
          resourceId: feedbackResourceId,
          threadId: feedbackThreadId,
          title: `Feedback for: ${documentData.query}`,
          metadata: {
            query: documentData.query,
            feedback,
            timestamp: new Date().toISOString(),
            origin: "system",
          },
        });
      } catch (storageError) {
        console.error("Error storing feedback in memory:", storageError);
      }

      return {
        query: documentData.query,
        document: documentData.document,
        feedback,
        timestamp: documentData.timestamp,
      };
    } catch (error) {
      console.error("Error in feedback step:", error);
      return {
        query: documentData.query,
        document: documentData.document,
        feedback: {
          accuracy: 5,
          completeness: 5,
          clarity: 5,
          comments: "Error occurred during feedback collection",
        },
        timestamp: documentData.timestamp,
      };
    }
  },
});
```