-- JR Corporate account template.
-- Run in the Supabase SQL editor as the project owner. Run it once per person.
-- Replace the four placeholders at the keyboard. Do not save the filled statement
-- and do not commit it. This file has no real names, emails, or PINs.
--
-- The PIN you type is temporary. On first sign-in, HotelHQ asks for a new
-- 4 to 6 digit PIN. Do not reuse any PIN that has ever been in the public
-- website or in git history. Trivial PINs (1111, 1234, and the retired
-- public-site PINs) are rejected.
--
-- p_email: null, or a real inbox if this person should also get a Supabase
-- reset link. Do not use an @staff.jrhospitality.local address.
-- p_login_id: null. The database picks a random id. The app never shows it.

select private.provision_corporate(
  p_name => 'FULL NAME',
  p_login_id => null,
  p_pin => 'TEMPORARY_PIN',
  p_email => null
);

-- A later hotel account uses the same pattern. Role is the app_role value
-- (gm, agm, front_desk, hk_lead, housekeeper, maintenance, shuttle_driver,
-- house_person, laundry, breakfast, bartender). Hotel is MSPWE, MSPAM, or MSPMS.
-- select private.provision_staff(
--   p_name => 'FULL NAME',
--   p_login_id => null,
--   p_pin => 'TEMPORARY_PIN',
--   p_email => null,
--   p_hotel => 'MSPWE',
--   p_role => 'gm'
-- );
