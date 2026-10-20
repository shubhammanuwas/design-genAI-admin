export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string;
  is_superadmin: boolean;
};

export type Generation = {
  id: string;
  user_id: string;
  photo_path: string;
  prompt: string;
  caption: string;
  created_at: string;
};

export type Vote = {
  generation_id: string;
  user_id: string;
  value: -1 | 1;
  created_at: string;
};

export type VoteCount = {
  generation_id: string;
  upvotes: number;
  downvotes: number;
};

export type UserRecord = {
  id: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          is_superadmin?: boolean;
        };
        Update: {
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          is_superadmin?: boolean;
        };
        Relationships: [];
      };
      generations: {
        Row: Generation;
        Insert: {
          id?: string;
          user_id: string;
          photo_path: string;
          prompt: string;
          caption: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          photo_path?: string;
          prompt?: string;
          caption?: string;
        };
        Relationships: [];
      };
      caption_votes: {
        Row: Vote;
        Insert: {
          generation_id: string;
          user_id: string;
          value: -1 | 1;
          created_at?: string;
        };
        Update: { value?: -1 | 1 };
        Relationships: [];
      };
      users: {
        Row: UserRecord;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      get_caption_vote_counts: {
        Args: Record<never, never>;
        Returns: VoteCount[];
      };
      is_current_user_superadmin: {
        Args: Record<never, never>;
        Returns: boolean;
      };
      set_profile_superadmin: {
        Args: {
          target_profile_id: string;
          should_be_superadmin: boolean;
        };
        Returns: boolean;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
