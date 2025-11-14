import { createConnection } from './medusa-config'
import { Modules } from '@medusajs/framework/utils'

async function checkUser() {
  const container = await createConnection()
  const userModule = container.resolve(Modules.USER)
  
  try {
    const user = await userModule.retrieveUser({ email: 'Kittilsen.stian@gmail.com' })
    console.log('User found:', user)
    
    // Check if user has team membership
    const authModule = container.resolve(Modules.AUTH)
    // Additional checks needed
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkUser()
