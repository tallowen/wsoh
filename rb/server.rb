require 'rubygems'
require 'sinatra'
$LOAD_PATH << Dir.pwd + "/lib/grooveshark/lib"
require 'lib/grooveshark/lib/grooveshark'

client = Grooveshark::Client.new

get '/search' do
  client.search_songs(params[:q]).map { |song| song.to_hash }.to_json
end

get '/songs/:id/play/' do
  redirect client.get_song_url_by_id(params[:id])
end