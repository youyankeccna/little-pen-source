import unittest
import test_mobile

class MobileRegistration(unittest.TestCase):
 setUp=test_mobile.MobileFlow.setUp
 tearDown=test_mobile.MobileFlow.tearDown
 call=test_mobile.MobileFlow.call
 def test_native_registration_uses_the_same_website_account(self):
  body=dict(username='new_mobile_parent',password='abcdefgh')
  status,result,cookie=self.call('POST','/auth/mobile/register',body)
  self.assertEqual(status,200,result);self.assertIsNone(cookie);self.assertTrue(result['accessToken']);self.assertTrue(result['recoveryCode'])
  self.assertNotIn('password',result);self.assertIsNone(result['user']['preferences'])
  token=result['accessToken'];self.assertEqual(self.call('GET','/me',token=token)[1]['user']['id'],result['user']['id'])
  status,website,_=self.call('POST','/auth/login',body,origin=True);self.assertEqual(status,200);self.assertEqual(website['user']['id'],result['user']['id'])
  self.assertEqual(self.call('POST','/auth/mobile/register',body)[0],409)
  self.assertEqual(self.call('POST','/auth/mobile/register',dict(username='foreign',password='abcdefgh'),origin='https://evil.example')[0],403)
 def test_native_recovery_revokes_all_sessions_and_can_renew_code(self):
  body=dict(username='recover_mobile_parent',password='abcdefgh')
  _,registered,_=self.call('POST','/auth/mobile/register',body);token=registered['accessToken'];code=registered['recoveryCode']
  _,_,cookie=self.call('POST','/auth/login',body,origin=True);cookie=cookie.split(';')[0]
  reset=dict(username=body['username'],recoveryCode=code,newPassword='newpassword123',confirmPassword='newpassword123')
  self.assertEqual(self.call('POST','/auth/mobile/reset-password',reset)[0],200)
  self.assertIsNone(self.call('GET','/me',token=token)[1]['user']);self.assertIsNone(self.call('GET','/me',cookie=cookie)[1]['user'])
  self.assertEqual(self.call('POST','/auth/mobile/reset-password',reset)[0],400)
  self.assertEqual(self.call('POST','/auth/mobile/login',body)[0],401)
  status,result,_=self.call('POST','/auth/mobile/login',dict(username=body['username'],password='newpassword123'));self.assertEqual(status,200)
  status,result,_=self.call('POST','/auth/recovery-code',dict(password='newpassword123'),token=result['accessToken']);self.assertEqual(status,200);self.assertNotEqual(result['recoveryCode'],code)
  reset['recoveryCode']=result['recoveryCode'];self.assertEqual(self.call('POST','/auth/mobile/reset-password',reset)[0],200)

if __name__=='__main__':unittest.main()
