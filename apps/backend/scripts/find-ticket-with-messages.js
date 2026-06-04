/**
 * البحث عن تذكرة بها رسائل فعلية
 */

const axios = require('axios');

async function findTicketWithMessages() {
  const apiKey = "727e9c9a388b37ed8bdd2b66eee21f28606452e08967adc493b159797c3d893f";
  const baseUrl = "https://backoffice.turbo-eg.com/external-api";
  
  console.log('🔍 Searching for tickets with messages...\n');

  try {
    // Get more tickets to increase chances of finding one with messages
    console.log('1️⃣ Getting tickets list (50 tickets)...');
    const ticketsResponse = await axios.get(`${baseUrl}/tickets`, {
      params: {
        authentication_key: apiKey,
        per_page: 50,
        page: 1
      }
    });
    
    const tickets = ticketsResponse.data?.feed?.data || [];
    console.log(`Found ${tickets.length} tickets\n`);
    
    if (tickets.length === 0) {
      console.log('❌ No tickets found');
      return;
    }

    // Test each ticket to find one with messages
    console.log('2️⃣ Testing tickets for messages...');
    let foundTicketWithMessages = null;
    let foundTicketWithLogs = null;
    
    for (let i = 0; i < Math.min(tickets.length, 10); i++) {
      const ticket = tickets[i];
      console.log(`\n🎫 Testing ticket #${ticket.id}...`);
      
      try {
        // Test ticket details
        const detailsResponse = await axios.get(`${baseUrl}/tickets/${ticket.id}`, {
          params: { authentication_key: apiKey }
        });
        
        const ticketData = detailsResponse.data.feed?.ticket;
        const messagesCount = ticketData?.messages?.length || 0;
        
        console.log(`  - Messages: ${messagesCount}`);
        
        if (messagesCount > 0 && !foundTicketWithMessages) {
          foundTicketWithMessages = ticket.id;
          console.log(`  ✅ Found ticket with ${messagesCount} messages!`);
          
          // Show sample messages
          console.log('  💬 Sample messages:');
          ticketData.messages.slice(0, 3).forEach((msg, idx) => {
            console.log(`    ${idx + 1}. [${msg.is_client_message ? 'CLIENT' : 'SUPPORT'}] ${msg.sender_name}: ${msg.message?.substring(0, 50)}...`);
          });
        }
        
        // Test logs
        const logsResponse = await axios.get(`${baseUrl}/tickets/log/${ticket.id}`, {
          params: { authentication_key: apiKey }
        });
        
        const logsCount = logsResponse.data.feed?.logs?.length || 0;
        console.log(`  - Logs: ${logsCount}`);
        
        if (logsCount > 0 && !foundTicketWithLogs) {
          foundTicketWithLogs = ticket.id;
          console.log(`  ✅ Found ticket with ${logsCount} logs!`);
          
          // Show sample logs
          console.log('  📋 Sample logs:');
          logsResponse.data.feed.logs.slice(0, 2).forEach((log, idx) => {
            console.log(`    ${idx + 1}. ${log.user?.full_name || 'Unknown'}: ${log.description?.substring(0, 50)}...`);
          });
        }
        
        if (foundTicketWithMessages && foundTicketWithLogs) {
          break; // Found both types, no need to continue
        }
        
      } catch (error) {
        console.log(`  ❌ Error testing ticket: ${error.message}`);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Ticket with messages: ${foundTicketWithMessages || 'None found'}`);
    console.log(`✅ Ticket with logs: ${foundTicketWithLogs || 'None found'}`);
    
    if (foundTicketWithMessages) {
      console.log(`\n🔗 Test URL with messages: https://mokhtarelhenawy.online/settings/turbo/ticket/${foundTicketWithMessages}`);
    }
    
    if (foundTicketWithLogs) {
      console.log(`🔗 Test URL with logs: https://mokhtarelhenawy.online/settings/turbo/ticket/${foundTicketWithLogs}`);
    }
    
    // Test unreaded_tickets one more time
    console.log('\n3️⃣ Testing unreaded_tickets endpoint again...');
    try {
      const unreadResponse = await axios.get(`${baseUrl}/tickets/unreaded_tickets`, {
        params: { authentication_key: apiKey }
      });
      
      console.log('📊 Unreaded tickets response:');
      console.log('- Success:', unreadResponse.data.success);
      console.log('- Data:', JSON.stringify(unreadResponse.data, null, 2));
      
    } catch (error) {
      console.error('❌ Unreaded endpoint error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the search
if (require.main === module) {
  findTicketWithMessages().catch(console.error);
}

module.exports = findTicketWithMessages;
